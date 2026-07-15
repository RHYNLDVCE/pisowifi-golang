package api

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"pisowifi/internal/config"
	"pisowifi/internal/db"
	"pisowifi/internal/infrastructure"
	"pisowifi/internal/logger"
	"pisowifi/internal/network"
	"pisowifi/internal/security"
	"pisowifi/internal/services"
	"pisowifi/internal/state"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

// RegisterAdminRoutes mounts all admin/auth routes behind the security middleware.
func RegisterAdminRoutes(app *fiber.App) {
	// Public auth routes
	app.Get("/login", loginPage)
	app.Post("/auth", loginAction)
	app.Get("/logout", logoutAction)

	// Protected admin group
	admin := app.Group("/admin", security.AdminMiddleware)
	admin.Get("/api/dashboard_data", getDashboardData)
	admin.Get("/system_stats", getSystemStats)
	admin.Get("/get_infrastructure_devices", getInfrastructureDevices)
	admin.Get("/api/logs", getLogsJSON)
	admin.Get("/get_restart_schedule", getRestartSchedule)
	admin.Post("/set_restart_schedule", setRestartSchedule)
	admin.Get("/get_points_config", getPointsConfig)
	admin.Post("/save_points_config", savePointsConfig)
	admin.Post("/update_settings", updateSettings)
	admin.Post("/reboot", rebootDevice)
	admin.Post("/clear_banners", clearBanners)
	admin.Post("/upload_banners", uploadBanners)
	admin.Post("/save_banner_order", saveBannerOrder)
	admin.Post("/delete_banner", deleteBanner)
	admin.Post("/upload_sound", uploadSound)
	admin.Get("/backup", downloadBackup)
	admin.Post("/restore", restoreBackup)
	admin.Post("/reset_settings", resetSettings)
	admin.Get("/api/user/:mac", getSingleUser)
	admin.Post("/manage_time", adminManageTime)
	admin.Post("/manage_points", adminManagePoints)
	admin.Post("/block", adminBlock)
	admin.Post("/unblock", adminUnblock)
	admin.Post("/delete_user", adminDeleteUser)
	admin.Post("/rename_device", renameDevice)

	// WebSockets (not under the group middleware — Fiber WS upgrade is separate)
	app.Get("/admin/ws/system_stats", websocket.New(wsSystemStats))
	app.Get("/admin/ws/logs", websocket.New(wsLogs))

	// Catch-all to serve the React SPA index.html for any remaining /admin sub-route
	admin.Get("/*", func(c *fiber.Ctx) error {
		return c.SendFile("./admin-ui/dist/index.html")
	})
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

func loginPage(c *fiber.Ctx) error {
	return c.Render("login", fiber.Map{})
}

func loginAction(c *fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")
	clientIP := c.IP()
	clientMAC := infrastructure.GetMACFromIP(clientIP)

	if Limiter.IsBlocked(clientIP) {
		logger.AuditLog("SECURITY_ALERT", clientIP, clientMAC, fmt.Sprintf("Rate limit exceeded for account '%s'", username))
		return c.Redirect("/login?error=Too many attempts. Try again in 5 minutes.", fiber.StatusSeeOther)
	}

	if db.VerifyAdmin(username, password) {
		logger.AuditLog("LOGIN_SUCCESS", clientIP, clientMAC, fmt.Sprintf("Account '%s' authenticated.", username))
		token, err := security.CreateToken(username)
		if err != nil {
			return c.Status(500).SendString("Token error")
		}
		Limiter.Clear(clientIP)
		c.Cookie(&fiber.Cookie{
			Name:     "admin_token",
			Value:    token,
			HTTPOnly: true,
			SameSite: "Lax",
		})
		return c.Redirect("/admin", fiber.StatusSeeOther)
	}

	Limiter.RecordAttempt(clientIP)
	logger.AuditLog("LOGIN_FAILED", clientIP, clientMAC, fmt.Sprintf("Failed attempt for account '%s'.", username))
	return c.Redirect("/login?error=Invalid Credentials", fiber.StatusSeeOther)
}

func logoutAction(c *fiber.Ctx) error {
	clientIP := c.IP()
	clientMAC := infrastructure.GetMACFromIP(clientIP)
	logger.AuditLog("LOGOUT", clientIP, clientMAC, "Administrator logged out.")
	c.ClearCookie("admin_token")
	return c.Redirect("/login", fiber.StatusFound)
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const itemsPerPage = 10

func getDashboardData(c *fiber.Ctx) error {
	search := c.Query("search", "")
	page := c.QueryInt("page", 1)

	cfg := config.Get()
	stats := services.GetDashboardStats()
	leases := infrastructure.GetDhcpLeases()
	customNames := cfg.CustomDeviceNames

	type enriched struct {
		MAC  string
		Data *state.UserRecord
		Name string
	}

	var users []enriched
	state.Users.Range(func(mac string, u *state.UserRecord) {
		name, _ := infrastructure.GetVendorInfo(mac, u.IP, leases)
		if customNames[mac] != "" {
			name = customNames[mac]
		}
		users = append(users, enriched{MAC: mac, Data: u, Name: name})
	})

	if search != "" {
		lower := strings.ToLower(search)
		var filtered []enriched
		for _, u := range users {
			if strings.Contains(strings.ToLower(u.MAC), lower) {
				filtered = append(filtered, u)
			}
		}
		users = filtered
	}

	sort.Slice(users, func(i, j int) bool {
		rank := func(s string) int {
			if s == "connected" {
				return 1
			} else if s == "expired" {
				return 3
			}
			return 2
		}
		ri, rj := rank(users[i].Data.Status), rank(users[j].Data.Status)
		if ri != rj {
			return ri < rj
		}
		return users[i].Data.Time > users[j].Data.Time
	})

	totalFiltered := len(users)
	totalPages := int(math.Ceil(float64(totalFiltered) / float64(itemsPerPage)))
	if totalPages < 1 {
		totalPages = 1
	}
	if page < 1 {
		page = 1
	}
	if page > totalPages {
		page = totalPages
	}

	start := (page - 1) * itemsPerPage
	end := start + itemsPerPage
	if end > totalFiltered {
		end = totalFiltered
	}
	paginatedUsers := users[start:end]

	// Build user map for template
	usersMap := make(map[string]fiber.Map)
	for _, u := range paginatedUsers {
		shortStatus := ""
		if len(u.Data.Status) > 0 {
			shortStatus = string(u.Data.Status[0])
		}
		usersMap[u.MAC] = fiber.Map{
			"ip": u.Data.IP, "time": u.Data.Time, "status": u.Data.Status,
			"balance": u.Data.Balance, "points": u.Data.Points,
			"free_claimed": u.Data.FreeClaimed, "device_name": u.Name,
			"time_formatted": services.FormatHumanTime(u.Data.Time),
			"status_short":   shortStatus,
		}
	}

	activeMacs := map[string]bool{}
	state.Users.Range(func(mac string, _ *state.UserRecord) { activeMacs[mac] = true })
	devices := infrastructure.ScanInfrastructure(activeMacs, customNames)
	bannerFiles := infrastructure.GetBanners(cfg.BannerOrder)
	soundFiles := infrastructure.GetSounds()
	logResult := infrastructure.GetSystemLogs(200, 0, "")

	activeCount := 0
	state.Users.Range(func(_ string, u *state.UserRecord) {
		if u.Status == "connected" {
			activeCount++
		}
	})

	return c.JSON(fiber.Map{
		"users": usersMap, "devices": devices,
		"current_page": page, "total_pages": totalPages,
		"search_query": search, "active_users": activeCount,
		"total_users":          state.Users.Count(),
		"stats":                stats,
		"slot_timeout":         cfg.SlotTimeout,
		"inactive_timeout":     cfg.InactiveTimeout,
		"auto_pause_enabled":   cfg.AutoPauseEnabled,
		"speed_limit_enabled":  cfg.SpeedLimitEnabled,
		"global_speed_limit":   cfg.GlobalSpeedLimit,
		"gaming_mode_enabled":  cfg.GamingModeEnabled,
		"coin_rates":           cfg.CoinRates,
		"banner_text":          cfg.BannerText,
		"banner_link":          cfg.BannerLink,
		"open_nat_enabled":     cfg.OpenNATEnabled,
		"custom_ttl":           cfg.CustomTTL,
		"banner_files":         bannerFiles,
		"free_time_enabled":    cfg.FreeTimeEnabled,
		"free_time_duration":   cfg.FreeTimeDuration,
		"sound_files":          soundFiles,
		"sound_insert_selected": cfg.SoundInsert,
		"sound_coin_selected":   cfg.SoundCoin,
		"system_logs":          logResult.Logs,
	})
}

// ---------------------------------------------------------------------------
// System Stats
// ---------------------------------------------------------------------------

func getSystemStats(c *fiber.Ctx) error {
	return c.JSON(infrastructure.GetSystemStats())
}

func wsSystemStats(c *websocket.Conn) {
	for {
		if state.IsShuttingDown.Load() {
			return
		}
		if err := c.WriteJSON(infrastructure.GetSystemStats()); err != nil {
			return
		}
		time.Sleep(3 * time.Second)
	}
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

func getLogsJSON(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 100)
	offset := c.QueryInt("offset", 0)
	logType := c.Query("log_type", "")
	return c.JSON(infrastructure.GetSystemLogs(limit, offset, logType))
}

func wsLogs(c *websocket.Conn) {
	f, err := os.Open("system.log")
	if err != nil {
		return
	}
	defer f.Close()

	// Seek to end minus last 200 lines
	lines, _ := tailLines(f, 200)
	for _, line := range lines {
		if m := parseLogLine(line); m != nil {
			c.WriteJSON(m)
		}
	}
	// Tail continuously
	for {
		if state.IsShuttingDown.Load() {
			return
		}
		buf := make([]byte, 4096)
		n, err := f.Read(buf)
		if n == 0 || err != nil {
			time.Sleep(500 * time.Millisecond)
			continue
		}
		for _, line := range strings.Split(string(buf[:n]), "\n") {
			if m := parseLogLine(line); m != nil {
				if err := c.WriteJSON(m); err != nil {
					return
				}
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Infrastructure devices
// ---------------------------------------------------------------------------

func getInfrastructureDevices(c *fiber.Ctx) error {
	cfg := config.Get()
	activeMacs := map[string]bool{}
	state.Users.Range(func(mac string, _ *state.UserRecord) { activeMacs[mac] = true })
	devices := infrastructure.ScanInfrastructure(activeMacs, cfg.CustomDeviceNames)
	return c.JSON(fiber.Map{"devices": devices})
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

func getRestartSchedule(c *fiber.Ctx) error {
	return c.JSON(config.Get().RestartSchedule)
}

func setRestartSchedule(c *fiber.Ctx) error {
	var body struct {
		Enabled bool   `json:"enabled"`
		Time    string `json:"time"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	config.Update(func(cfg *config.AppConfig) {
		cfg.RestartSchedule = config.RestartSchedule{Enabled: body.Enabled, Time: body.Time}
	})
	config.Save()
	clientIP := c.IP()
	logger.AuditLog("CONFIG_UPDATE", clientIP, infrastructure.GetMACFromIP(clientIP),
		fmt.Sprintf("Modified restart schedule to %s (Enabled: %v)", body.Time, body.Enabled))
	return c.JSON(fiber.Map{"status": "success", "message": "Schedule updated"})
}

func getPointsConfig(c *fiber.Ctx) error {
	cfg := config.Get()
	return c.JSON(fiber.Map{
		"enabled":  cfg.PointsEnabled,
		"coin_map": cfg.CoinPointMap,
		"promos":   cfg.PointPromos,
	})
}

func savePointsConfig(c *fiber.Ctx) error {
	var body struct {
		Enabled bool                 `json:"enabled"`
		CoinMap map[string]float64   `json:"coin_map"`
		Promos  []config.PromoItem   `json:"promos"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	config.Update(func(cfg *config.AppConfig) {
		cfg.PointsEnabled = body.Enabled
		cfg.CoinPointMap = body.CoinMap
		cfg.PointPromos = body.Promos
	})
	config.Save()
	clientIP := c.IP()
	logger.AuditLog("CONFIG_UPDATE", clientIP, infrastructure.GetMACFromIP(clientIP), "Modified global points configuration")
	return c.JSON(fiber.Map{"status": "success", "message": "Points configuration saved"})
}

func updateSettings(c *fiber.Ctx) error {
	clientIP := c.IP()
	clientMAC := infrastructure.GetMACFromIP(clientIP)

	var rawBody map[string]interface{}
	if err := c.BodyParser(&rawBody); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	getString := func(key string) string {
		if val, ok := rawBody[key]; ok {
			return fmt.Sprintf("%v", val)
		}
		return ""
	}

	body := struct {
		Timeout          string
		InactiveTimeout  string
		AutoPause        string
		SpeedLimitVal    string
		SpeedLimitToggle string
		GamingMode       string
		CoinRates        string
		BannerText       string
		BannerLink       string
		FreeTimeToggle   string
		FreeTimeDuration string
		SoundInsert      string
		SoundCoin        string
		OpenNAT          string
		CustomTTL        string
	}{
		Timeout:          getString("timeout"),
		InactiveTimeout:  getString("inactive_timeout"),
		AutoPause:        getString("auto_pause"),
		SpeedLimitVal:    getString("speed_limit_val"),
		SpeedLimitToggle: getString("speed_limit_toggle"),
		GamingMode:       getString("gaming_mode"),
		CoinRates:        getString("coin_rates"),
		BannerText:       getString("banner_text"),
		BannerLink:       getString("banner_link"),
		FreeTimeToggle:   getString("free_time_toggle"),
		FreeTimeDuration: getString("free_time_duration"),
		SoundInsert:      getString("sound_insert"),
		SoundCoin:        getString("sound_coin"),
		OpenNAT:          getString("open_nat"),
		CustomTTL:        getString("custom_ttl"),
	}

	newFreeEnabled := body.FreeTimeToggle == "on"
	oldFreeEnabled := config.Get().FreeTimeEnabled
	if newFreeEnabled != oldFreeEnabled {
		db.ResetAllFreeClaimed()
		state.Users.Range(func(mac string, u *state.UserRecord) {
			state.Users.UpdateField(mac, func(u *state.UserRecord) { u.FreeClaimed = 0 })
		})
	}

	config.Update(func(cfg *config.AppConfig) {
		parseInt := func(s string, def int) int {
			var v int
			if _, err := fmt.Sscan(s, &v); err != nil {
				return def
			}
			return v
		}
		cfg.SlotTimeout = parseInt(body.Timeout, 30)
		cfg.InactiveTimeout = parseInt(body.InactiveTimeout, 900)
		cfg.AutoPauseEnabled = body.AutoPause == "on"
		cfg.GlobalSpeedLimit = parseInt(body.SpeedLimitVal, 5)
		cfg.SpeedLimitEnabled = body.SpeedLimitToggle == "on"
		cfg.GamingModeEnabled = body.GamingMode == "on"
		cfg.CoinRates = body.CoinRates
		cfg.BannerText = body.BannerText
		cfg.BannerLink = body.BannerLink
		cfg.FreeTimeEnabled = newFreeEnabled
		cfg.FreeTimeDuration = parseInt(body.FreeTimeDuration, 5)
		cfg.SoundInsert = body.SoundInsert
		cfg.SoundCoin = body.SoundCoin
		cfg.OpenNATEnabled = body.OpenNAT == "on"
		cfg.CustomTTL = parseInt(body.CustomTTL, 1)
	})
	config.Save()
	network.RefreshAllLimits()
	logger.AuditLog("CONFIG_UPDATE", clientIP, clientMAC, "Updated core system settings")
	return c.JSON(fiber.Map{"status": "success"})
}

func rebootDevice(c *fiber.Ctx) error {
	clientIP := c.IP()
	logger.AuditLog("SYSTEM_REBOOT", clientIP, infrastructure.GetMACFromIP(clientIP), "Initiated manual system reboot")
	go func() {
		time.Sleep(2 * time.Second)
		infrastructure.RebootDevice()
	}()
	return c.JSON(fiber.Map{"status": "success", "message": "Rebooting now..."})
}

func resetSettings(c *fiber.Ctx) error {
	clientIP := c.IP()
	
	if err := config.ResetToDefaults(); err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Failed to reset configuration"})
	}

	logger.AuditLog("SYSTEM_RESET", clientIP, infrastructure.GetMACFromIP(clientIP), "Performed a factory reset of system configuration settings. Rebooting...")

	go func() {
		time.Sleep(2 * time.Second)
		infrastructure.RebootDevice()
	}()

	return c.JSON(fiber.Map{"status": "success", "message": "Settings reset to defaults. Rebooting system..."})
}

func downloadBackup(c *fiber.Ctx) error {
	clientIP := c.IP()
	
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	// Add config.json
	if configData, err := os.ReadFile("config.json"); err == nil {
		if f, err := zipWriter.Create("config.json"); err == nil {
			f.Write(configData)
		}
	}

	// Add pisowifi.db
	if dbData, err := os.ReadFile("pisowifi.db"); err == nil {
		if f, err := zipWriter.Create("pisowifi.db"); err == nil {
			f.Write(dbData)
		}
	}

	zipWriter.Close()

	logger.AuditLog("SYSTEM_BACKUP", clientIP, infrastructure.GetMACFromIP(clientIP), "Downloaded system database backup")

	c.Set("Content-Type", "application/zip")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=pisowifi_backup_%s.zip", time.Now().Format("20060102_150405")))
	return c.Send(buf.Bytes())
}

func restoreBackup(c *fiber.Ctx) error {
	clientIP := c.IP()
	
	file, err := c.FormFile("backup_file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "No file uploaded"})
	}

	// Save the uploaded file to a temporary location
	tmpPath := "uploaded_backup.zip"
	if err := c.SaveFile(file, tmpPath); err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Failed to save uploaded file"})
	}
	defer os.Remove(tmpPath)

	// Open the zip file
	r, err := zip.OpenReader(tmpPath)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid zip file"})
	}
	defer r.Close()

	var hasConfig, hasDB bool

	for _, f := range r.File {
		if f.Name == "config.json" {
			rc, err := f.Open()
			if err == nil {
				data, _ := io.ReadAll(rc)
				os.WriteFile("config.json", data, 0644)
				rc.Close()
				hasConfig = true
			}
		} else if f.Name == "pisowifi.db" {
			rc, err := f.Open()
			if err == nil {
				data, _ := io.ReadAll(rc)
				os.WriteFile("pisowifi.db", data, 0644)
				rc.Close()
				hasDB = true
			}
		}
	}

	if !hasConfig && !hasDB {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Zip file does not contain valid backup files"})
	}

	logger.AuditLog("SYSTEM_RESTORE", clientIP, infrastructure.GetMACFromIP(clientIP), "Restored system database backup. Rebooting...")

	// Schedule a reboot
	go func() {
		time.Sleep(2 * time.Second)
		infrastructure.RebootDevice()
	}()

	return c.JSON(fiber.Map{"status": "success", "message": "Backup restored successfully. Rebooting system..."})
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

func clearBanners(c *fiber.Ctx) error {
	clientIP := c.IP()
	folder := "static/banners/set"
	if entries, err := os.ReadDir(folder); err == nil {
		for _, e := range entries {
			os.Remove(filepath.Join(folder, e.Name()))
		}
	}
	config.Update(func(cfg *config.AppConfig) { cfg.BannerOrder = []string{} })
	config.Save()
	logger.AuditLog("CONFIG_UPDATE", clientIP, infrastructure.GetMACFromIP(clientIP), "Cleared all promotional banners")
	return c.JSON(fiber.Map{"status": "success"})
}

func uploadBanners(c *fiber.Ctx) error {
	clientIP := c.IP()
	os.MkdirAll("static/banners/set", 0755)
	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Bad form"})
	}
	files := form.File["files"]
	for _, f := range files {
		if err := c.SaveFile(f, filepath.Join("static/banners/set", f.Filename)); err != nil {
			continue
		}
	}
	logger.AuditLog("CONFIG_UPDATE", clientIP, infrastructure.GetMACFromIP(clientIP),
		fmt.Sprintf("Uploaded %d new promotional banners", len(files)))
	return c.JSON(fiber.Map{"status": "success"})
}

func saveBannerOrder(c *fiber.Ctx) error {
	orderStr := c.FormValue("order", "[]")
	var fileList []string
	if err := json.Unmarshal([]byte(orderStr), &fileList); err != nil {
		return c.JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	config.Update(func(cfg *config.AppConfig) { cfg.BannerOrder = fileList })
	config.Save()
	return c.JSON(fiber.Map{"status": "success"})
}

func deleteBanner(c *fiber.Ctx) error {
	filename := c.FormValue("filename", "")
	if filename != "" {
		os.Remove(filepath.Join("static/banners/set", filename))
		config.Update(func(cfg *config.AppConfig) {
			var newOrder []string
			for _, f := range cfg.BannerOrder {
				if f != filename {
					newOrder = append(newOrder, f)
				}
			}
			cfg.BannerOrder = newOrder
		})
		config.Save()
	}
	return c.JSON(fiber.Map{"status": "success"})
}

// ---------------------------------------------------------------------------
// Sounds
// ---------------------------------------------------------------------------

func uploadSound(c *fiber.Ctx) error {
	clientIP := c.IP()
	os.MkdirAll("static/sounds", 0755)
	f, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "No file"})
	}
	if err := c.SaveFile(f, filepath.Join("static/sounds", f.Filename)); err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Save error"})
	}
	logger.AuditLog("CONFIG_UPDATE", clientIP, infrastructure.GetMACFromIP(clientIP),
		fmt.Sprintf("Uploaded new sound file: %s", f.Filename))
	return c.JSON(fiber.Map{"status": "success"})
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

func getSingleUser(c *fiber.Ctx) error {
	mac := c.Params("mac")
	user, ok := state.Users.Get(mac)
	if !ok {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}
	leases := infrastructure.GetDhcpLeases()
	displayName, _ := infrastructure.GetVendorInfo(mac, user.IP, leases)
	salesHistory := db.GetUserSales(mac)
	for i, s := range salesHistory {
		salesHistory[i].DateStr = time.Unix(s.Timestamp, 0).Format("Jan 02, 2006 03:04 PM")
	}
	return c.JSON(fiber.Map{
		"mac":            mac,
		"user":           user,
		"time_formatted": services.FormatHumanTime(user.Time),
		"history":        salesHistory,
		"device_name":    displayName,
	})
}

func adminManageTime(c *fiber.Ctx) error {
	var body struct {
		MAC    string `json:"mac"`
		Amount string `json:"amount"`
		Unit   string `json:"unit"`
		Action string `json:"action"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	clientIP := c.IP()

	amount := 0
	fmt.Sscan(body.Amount, &amount)

	services.ManageUserTime(body.MAC, amount, body.Unit, body.Action)
	logger.AuditLog("TIME_UPDATE", clientIP, infrastructure.GetMACFromIP(clientIP),
		fmt.Sprintf("%s %d %s applied to target user %s", strings.ToUpper(body.Action), amount, body.Unit, body.MAC))
	return c.JSON(fiber.Map{"status": "success"})
}

func adminManagePoints(c *fiber.Ctx) error {
	var body struct {
		MAC    string `json:"mac"`
		Amount string `json:"amount"`
		Action string `json:"action"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	clientIP := c.IP()

	amount := 0.0
	fmt.Sscan(body.Amount, &amount)
	if amount < 0 {
		amount = -amount
	}

	state.Users.UpdateField(body.MAC, func(u *state.UserRecord) {
		if body.Action == "subtract" {
			u.Points -= amount
		} else {
			u.Points += amount
		}
		if u.Points < 0 {
			u.Points = 0
		}
	})
	if u, ok := state.Users.Get(body.MAC); ok {
		db.SyncUser(db.UserRecord{
			MAC: body.MAC, IP: u.IP, Time: u.Time, Status: u.Status,
			Balance: u.Balance, FreeClaimed: u.FreeClaimed, Points: u.Points,
		})
	}
	logger.AuditLog("POINTS_UPDATE", clientIP, infrastructure.GetMACFromIP(clientIP),
		fmt.Sprintf("%s %.1f points applied to target user %s", strings.ToUpper(body.Action), amount, body.MAC))
	return c.JSON(fiber.Map{"status": "success"})
}

func adminBlock(c *fiber.Ctx) error {
	var body struct{ MAC string `json:"mac"` }
	if err := c.BodyParser(&body); err != nil { return c.JSON(fiber.Map{"status":"error"}) }
	clientIP := c.IP()
	services.UpdateUserStatus(body.MAC, "blocked")
	logger.AuditLog("USER_BLOCKED", clientIP, infrastructure.GetMACFromIP(clientIP), fmt.Sprintf("Blocked access for target user %s", body.MAC))
	return c.JSON(fiber.Map{"status": "success"})
}

func adminUnblock(c *fiber.Ctx) error {
	var body struct{ MAC string `json:"mac"` }
	if err := c.BodyParser(&body); err != nil { return c.JSON(fiber.Map{"status":"error"}) }
	clientIP := c.IP()
	services.UpdateUserStatus(body.MAC, "new")
	logger.AuditLog("USER_UNBLOCKED", clientIP, infrastructure.GetMACFromIP(clientIP), fmt.Sprintf("Restored access for target user %s", body.MAC))
	return c.JSON(fiber.Map{"status": "success"})
}

func adminDeleteUser(c *fiber.Ctx) error {
	var body struct{ MAC string `json:"mac"` }
	if err := c.BodyParser(&body); err != nil { return c.JSON(fiber.Map{"status":"error"}) }
	clientIP := c.IP()
	services.DeleteUser(body.MAC)
	logger.AuditLog("USER_DELETED", clientIP, infrastructure.GetMACFromIP(clientIP), fmt.Sprintf("Deleted target user %s from system", body.MAC))
	return c.JSON(fiber.Map{"status": "success"})
}

func renameDevice(c *fiber.Ctx) error {
	var body struct {
		MAC  string `json:"mac"`
		Name string `json:"name"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.JSON(fiber.Map{"status": "error"})
	}
	clientIP := c.IP()
	config.Update(func(cfg *config.AppConfig) {
		if cfg.CustomDeviceNames == nil {
			cfg.CustomDeviceNames = map[string]string{}
		}
		cfg.CustomDeviceNames[body.MAC] = strings.TrimSpace(body.Name)
	})
	config.Save()
	logger.AuditLog("DEVICE_RENAMED", clientIP, infrastructure.GetMACFromIP(clientIP),
		fmt.Sprintf("Renamed device %s to '%s'", body.MAC, strings.TrimSpace(body.Name)))
	return c.JSON(fiber.Map{"status": "success"})
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func parseLogLine(line string) map[string]string {
	// Format: [timestamp] [TYPE] message
	line = strings.TrimSpace(line)
	if !strings.HasPrefix(line, "[") {
		return nil
	}
	// Extract first bracket pair = timestamp
	end1 := strings.Index(line, "]")
	if end1 < 0 {
		return nil
	}
	rest := strings.TrimSpace(line[end1+1:])
	if !strings.HasPrefix(rest, "[") {
		// Fallback legacy: [timestamp] message
		return map[string]string{
			"timestamp": line[1:end1],
			"type":      "SYSTEM",
			"message":   rest,
		}
	}
	end2 := strings.Index(rest, "]")
	if end2 < 0 {
		return nil
	}
	return map[string]string{
		"timestamp": line[1:end1],
		"type":      rest[1:end2],
		"message":   strings.TrimSpace(rest[end2+1:]),
	}
}

func tailLines(f *os.File, n int) ([]string, error) {
	const bufSize = 64 * 1024
	fi, err := f.Stat()
	if err != nil {
		return nil, err
	}
	size := fi.Size()
	if size == 0 {
		return nil, nil
	}
	buf := make([]byte, bufSize)
	var collected []byte
	for pos := size; pos > 0; {
		read := int64(bufSize)
		if pos < read {
			read = pos
		}
		pos -= read
		f.Seek(pos, io.SeekStart)
		nr, _ := f.Read(buf[:read])
		collected = append(buf[:nr], collected...)
		lines := strings.Split(string(collected), "\n")
		if len(lines) >= n+1 {
			return lines[len(lines)-n:], nil
		}
	}
	return strings.Split(string(collected), "\n"), nil
}



