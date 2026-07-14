package api

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"pisowifi/internal/config"
	"pisowifi/internal/db"
	"pisowifi/internal/hardware"
	"pisowifi/internal/infrastructure"
	"pisowifi/internal/logger"
	"pisowifi/internal/network"
	"pisowifi/internal/services"
	"pisowifi/internal/state"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

// RegisterPortalRoutes mounts all captive-portal and user-facing routes.
func RegisterPortalRoutes(app *fiber.App) {
	// --- Portal UI ---
	app.Get("/", portalHome)
	app.Get("/status", portalStatus)
	app.Get("/rewards", rewardsPage)

	// --- Session actions ---
	app.Post("/connect", connectUser)
	app.Post("/pause", pauseUser)
	app.Post("/enable_slot", enableSlot)
	app.Post("/cancel_slot", cancelSlot)
	app.Post("/claim_free_time", claimFreeTime)
	app.Post("/redeem_points", redeemPoints)

	// --- WebSocket ---
	app.Get("/ws/:mac", websocket.New(portalWS))

	// --- Captive portal detection endpoints ---
	// Android: expects HTTP 204 from /generate_204
	app.Get("/generate_204", func(c *fiber.Ctx) error {
		return c.Redirect("/", fiber.StatusFound)
	})
	// Android/Chrome: connectivitycheck.gstatic.com proxy
	app.Get("/gen_204", func(c *fiber.Ctx) error {
		return c.Redirect("/", fiber.StatusFound)
	})
	// Windows: /ncsi.txt (expects "Microsoft NCSI")
	app.Get("/ncsi.txt", func(c *fiber.Ctx) error {
		return c.Redirect("/", fiber.StatusFound)
	})
	// Windows: /connecttest.txt
	app.Get("/connecttest.txt", func(c *fiber.Ctx) error {
		return c.Redirect("/", fiber.StatusFound)
	})
	// macOS/iOS: /hotspot-detect.html
	app.Get("/hotspot-detect.html", func(c *fiber.Ctx) error {
		return c.Redirect("/", fiber.StatusFound)
	})
	app.Get("/library/test/success.html", func(c *fiber.Ctx) error {
		return c.Redirect("/", fiber.StatusFound)
	})
	// Generic redirect
	app.Get("/redirect", func(c *fiber.Ctx) error {
		return c.Redirect("/", fiber.StatusFound)
	})

	// Catch-all — must be last
	app.Get("/*", func(c *fiber.Ctx) error {
		return c.Redirect("/", fiber.StatusFound)
	})
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

func portalHome(c *fiber.Ctx) error {
	clientIP := c.IP()
	clientMAC := infrastructure.GetMACFromIP(clientIP)

	if clientMAC != "" && clientMAC != "00:00:00:00:00:00" {
		if _, ok := state.Users.Get(clientMAC); !ok {
			state.Users.Set(clientMAC, &state.UserRecord{
				Status: "new", Time: 0, Balance: 0, FreeClaimed: 0, Points: 0,
			})
		}
		state.Users.UpdateField(clientMAC, func(u *state.UserRecord) {
			u.IP = clientIP
			u.LastActive = float64(time.Now().UnixNano()) / 1e9
		})
	}

	// Banners
	cfg := config.Get()
	banners := buildBannerList(cfg.BannerOrder)

	user := &state.UserRecord{}
	if u, ok := state.Users.Get(clientMAC); ok {
		user = u
	}

	s_insert := cfg.SoundInsert
	if s_insert == "" {
		s_insert = "insert_coin_sound.mp3"
	}
	s_coin := cfg.SoundCoin
	if s_coin == "" {
		s_coin = "coin-recieved.mp3"
	}

	coinPointMapJSON, _ := json.Marshal(cfg.CoinPointMap)
	pointsEnabledJSON := "false"
	if cfg.PointsEnabled {
		pointsEnabledJSON = "true"
	}
	fHours := cfg.FreeTimeDuration / 60
	fMins := cfg.FreeTimeDuration % 60
	freeTimeFormatted := fmt.Sprintf("%d:%02d", fHours, fMins)

	return c.Render("index", fiber.Map{
		"mac":                   clientMAC,
		"ip":                    clientIP,
		"time":                  user.Time,
		"status":                user.Status,
		"balance":               user.Balance,
		"points":                user.Points,
		"banners":               banners,
		"banner_text":           cfg.BannerText,
		"banner_link":           cfg.BannerLink,
		"coin_rates":            cfg.CoinRates,
		"points_enabled":        cfg.PointsEnabled,
		"points_enabled_json":   pointsEnabledJSON,
		"coin_point_map":        cfg.CoinPointMap,
		"coin_point_map_json":   string(coinPointMapJSON),
		"free_time_enabled":     cfg.FreeTimeEnabled,
		"free_claimed":          user.FreeClaimed == 1,
		"free_duration":         cfg.FreeTimeDuration,
		"free_time_formatted":   freeTimeFormatted,
		"sound_insert_url":      fmt.Sprintf("/static/sounds/%s", s_insert),
		"sound_coin_url":        fmt.Sprintf("/static/sounds/%s", s_coin),
	})
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

func portalStatus(c *fiber.Ctx) error {
	mac := c.Query("mac")
	cfg := config.Get()

	user := &state.UserRecord{Status: "new"}
	if u, ok := state.Users.Get(mac); ok {
		user = u
	}
	if c.IP() != "" {
		state.Users.UpdateField(mac, func(u *state.UserRecord) {
			u.IP = c.IP()
		})
	}

	slotUser := state.GetSlotUser()
	isBusy := slotUser != "" && slotUser != mac

	slotSecsLeft := 0
	if slotUser == mac {
		left := cfg.SlotExpiryTimestamp - float64(time.Now().Unix())
		if left < 0 {
			left = 0
		}
		slotSecsLeft = int(left)
	}

	return c.JSON(fiber.Map{
		"time_remaining":   user.Time,
		"status":           user.Status,
		"balance":          user.Balance,
		"is_busy":          isBusy,
		"slot_seconds":     slotSecsLeft,
		"slot_max_seconds": cfg.SlotTimeout,
		"coin_rates":       cfg.CoinRates,
		"banner_text":      cfg.BannerText,
		"banner_link":      cfg.BannerLink,
		"points":           user.Points,
		"points_enabled":   cfg.PointsEnabled,
		"coin_point_map":   cfg.CoinPointMap,
	})
}

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

func portalWS(c *websocket.Conn) {
	mac := c.Params("mac")
	state.Manager.Connect(mac, c)
	defer state.Manager.Disconnect(mac)

	if c.RemoteAddr() != nil {
		ip := strings.Split(c.RemoteAddr().String(), ":")[0]
		state.Users.UpdateField(mac, func(u *state.UserRecord) {
			u.IP = ip
			u.LastActive = float64(time.Now().UnixNano()) / 1e9
		})
	}

	for {
		if _, _, err := c.ReadMessage(); err != nil {
			break
		}
		state.Users.UpdateField(mac, func(u *state.UserRecord) {
			u.LastActive = float64(time.Now().UnixNano()) / 1e9
		})
	}
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

func connectUser(c *fiber.Ctx) error {
	mac := c.Query("mac")
	result := services.ConnectUser(mac)
	return c.JSON(fiber.Map{"result": result})
}

func pauseUser(c *fiber.Ctx) error {
	mac := c.Query("mac")
	result := services.PauseUser(mac)
	return c.JSON(fiber.Map{"result": result})
}

// ---------------------------------------------------------------------------
// Slot management
// ---------------------------------------------------------------------------

func enableSlot(c *fiber.Ctx) error {
	mac := c.Query("mac")
	cfg := config.Get()

	user, ok := state.Users.Get(mac)
	if ok && user.Status == "blocked" {
		return c.JSON(fiber.Map{"result": "blocked"})
	}

	slotUser := state.GetSlotUser()
	if slotUser == "" || slotUser == mac {
		state.SetSlotUser(mac)
		hardware.TurnSlotOn()
		config.Update(func(cfg *config.AppConfig) {
			cfg.SlotExpiryTimestamp = float64(time.Now().Unix()) + float64(cfg.SlotTimeout)
		})
		logger.SystemLog(fmt.Sprintf("[PORTAL_EVENT] SLOT OPENED by Device: %s", mac))

		bal := 0
		pts := 0.0
		trem := 0
		if user != nil {
			bal = user.Balance
			pts = user.Points
			trem = user.Time
		}

		state.Manager.Send(mac, fiber.Map{
			"type":           "slot_opened",
			"slot_seconds":   cfg.SlotTimeout,
			"balance":        bal,
			"points":         pts,
			"coin_rates":     cfg.CoinRates,
			"time_remaining": trem,
		})
		return c.JSON(fiber.Map{"result": "success"})
	}
	return c.JSON(fiber.Map{"result": "busy"})
}

func cancelSlot(c *fiber.Ctx) error {
	mac := c.Query("mac")
	if state.GetSlotUser() == mac {
		hardware.TurnSlotOff()
		state.SetSlotUser("")
		config.Update(func(cfg *config.AppConfig) {
			cfg.SlotExpiryTimestamp = 0
		})
		return c.JSON(fiber.Map{"result": "success"})
	}
	return c.JSON(fiber.Map{"result": "fail"})
}

// ---------------------------------------------------------------------------
// Free time
// ---------------------------------------------------------------------------

func claimFreeTime(c *fiber.Ctx) error {
	mac := c.Query("mac")
	cfg := config.Get()

	if !cfg.FreeTimeEnabled {
		return c.JSON(fiber.Map{"result": "disabled"})
	}

	user, ok := state.Users.Get(mac)
	if !ok {
		return c.JSON(fiber.Map{"result": "error"})
	}
	if user.FreeClaimed == 1 {
		return c.JSON(fiber.Map{"result": "already_claimed"})
	}

	duration := cfg.FreeTimeDuration
	now := float64(time.Now().UnixNano()) / 1e9

	state.Users.UpdateField(mac, func(u *state.UserRecord) {
		u.Time += duration * 60
		u.FreeClaimed = 1
		u.Status = "connected"
		u.LastActive = now
		u.ExpiresAt = now + float64(u.Time)
	})

	network.AllowUser(mac, user.IP)
	if state.GetSlotUser() == mac {
		hardware.TurnSlotOff()
		state.SetSlotUser("")
	}

	if fresh, ok := state.Users.Get(mac); ok {
		db.SyncUser(db.UserRecord{
			MAC: mac, IP: fresh.IP, Time: fresh.Time, Status: fresh.Status,
			Balance: fresh.Balance, FreeClaimed: fresh.FreeClaimed, Points: fresh.Points,
		})
		logger.SystemLog(fmt.Sprintf("[%s | %s] Claimed %d mins of Free Time.", user.IP, mac, duration))
		state.Manager.Send(mac, fiber.Map{
			"type": "sync", "status": "connected", "time_remaining": fresh.Time,
			"balance": 0, "points": fresh.Points,
		})
	}
	return c.JSON(fiber.Map{"result": "success"})
}

// ---------------------------------------------------------------------------
// Rewards / Points
// ---------------------------------------------------------------------------

func rewardsPage(c *fiber.Ctx) error {
	clientIP := c.IP()
	mac := infrastructure.GetMACFromIP(clientIP)
	cfg := config.Get()

	if mac != "" {
		if _, ok := state.Users.Get(mac); !ok {
			state.Users.Set(mac, &state.UserRecord{Status: "new"})
		}
	}

	user := &state.UserRecord{}
	if u, ok := state.Users.Get(mac); ok {
		user = u
	}

	return c.Render("rewards", fiber.Map{
		"mac":         mac,
		"points":      user.Points,
		"promos":      cfg.PointPromos,
		"enabled":     cfg.PointsEnabled,
		"banner_text": cfg.BannerText,
		"banner_link": cfg.BannerLink,
	})
}

func redeemPoints(c *fiber.Ctx) error {
	var body struct {
		PromoID int64 `json:"promo_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.JSON(fiber.Map{"status": "error", "message": "Invalid body"})
	}

	clientIP := c.IP()
	mac := infrastructure.GetMACFromIP(clientIP)
	cfg := config.Get()

	if mac == "" {
		return c.JSON(fiber.Map{"status": "error", "message": "User not found"})
	}
	if !cfg.PointsEnabled {
		return c.JSON(fiber.Map{"status": "error", "message": "Rewards disabled."})
	}

	user, ok := state.Users.Get(mac)
	if !ok {
		return c.JSON(fiber.Map{"status": "error", "message": "User not found"})
	}

	var promo *config.PromoItem
	for _, p := range cfg.PointPromos {
		if p.ID == body.PromoID {
			pp := p
			promo = &pp
			break
		}
	}
	if promo == nil {
		return c.JSON(fiber.Map{"status": "error", "message": "Invalid Promo"})
	}
	if user.Points < promo.Cost {
		return c.JSON(fiber.Map{"status": "error", "message": "Not enough points"})
	}

	now := float64(time.Now().UnixNano()) / 1e9
	state.Users.UpdateField(mac, func(u *state.UserRecord) {
		u.Points = services.RoundFloat(u.Points-promo.Cost, 2)
		u.Time += promo.Minutes * 60
		u.Status = "connected"
		u.LastActive = now
		u.ExpiresAt = now + float64(u.Time)
	})

	network.AllowUser(mac, user.IP)

	if fresh, ok := state.Users.Get(mac); ok {
		db.SyncUser(db.UserRecord{
			MAC: mac, IP: fresh.IP, Time: fresh.Time, Status: fresh.Status,
			Balance: fresh.Balance, FreeClaimed: fresh.FreeClaimed, Points: fresh.Points,
		})
		logger.SystemLog(fmt.Sprintf("[%s | %s] Redeemed '%s' for %.1f points.", clientIP, mac, promo.Name, promo.Cost))
		state.Manager.Send(mac, fiber.Map{
			"type": "sync", "status": "connected",
			"time_remaining": fresh.Time, "points": fresh.Points,
		})
	}
	return c.JSON(fiber.Map{"status": "success", "message": fmt.Sprintf("Successfully redeemed: %s", promo.Name)})
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func buildBannerList(order []string) []string {
	bannerDir := "static/banners/set"
	entries, err := os.ReadDir(bannerDir)
	if err != nil {
		return []string{"/static/banners/default/banner_default.jpg"}
	}
	allFiles := map[string]bool{}
	for _, e := range entries {
		ext := strings.ToLower(filepath.Ext(e.Name()))
		if ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".gif" || ext == ".webp" {
			allFiles[e.Name()] = true
		}
	}
	var banners []string
	for _, f := range order {
		if allFiles[f] {
			banners = append(banners, fmt.Sprintf("/static/banners/set/%s", f))
		}
	}
	for f := range allFiles {
		inList := false
		for _, b := range banners {
			if strings.HasSuffix(b, "/"+f) {
				inList = true
				break
			}
		}
		if !inList {
			banners = append(banners, fmt.Sprintf("/static/banners/set/%s", f))
		}
	}
	if len(banners) == 0 {
		banners = []string{"/static/banners/default/banner_default.jpg"}
	}
	return banners
}
