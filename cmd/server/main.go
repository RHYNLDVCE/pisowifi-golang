package main

import (
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"syscall"

	"pisowifi/internal/api"
	"pisowifi/internal/config"
	"pisowifi/internal/db"
	"pisowifi/internal/hardware"
	"pisowifi/internal/logger"
	"pisowifi/internal/network"
	"pisowifi/internal/services"
	"pisowifi/internal/state"

	"github.com/gofiber/fiber/v2"
	fiberrecover "github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/template/django/v3"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Load .env (must happen before config reads env vars)
	if err := godotenv.Load(); err != nil {
		fmt.Println("[Main] .env not found — using system environment variables.")
	}

	// Re-initialize config package vars that depend on env (they were set at
	// package init time before .env was loaded, so we reload them here)
	config.ReloadSecrets()

	// 2. Init logger
	logger.Init()
	logger.SystemLog("Initializing PisoWifi System...")

	// 3. Load app config from config.json
	config.Load()

	// 4. Ensure required directories exist
	os.MkdirAll("static/banners/set", 0755)
	os.MkdirAll("static/sounds", 0755)

	// 5. Init database
	db.InitDB()

	// 6. Load users into in-memory state
	records := db.LoadUsers()
	for mac, rec := range records {
		// Reset any "connected" users to "paused" on startup
		status := rec.Status
		if status == "connected" {
			status = "paused"
			db.SyncUser(db.UserRecord{
				MAC: mac, IP: rec.IP, Time: rec.Time, Status: "paused",
				Balance: rec.Balance, FreeClaimed: rec.FreeClaimed, Points: rec.Points,
			})
		}
		state.Users.Set(mac, &state.UserRecord{
			IP:          rec.IP,
			Time:        rec.Time,
			Status:      status,
			Balance:     rec.Balance,
			FreeClaimed: rec.FreeClaimed,
			Points:      rec.Points,
		})
	}

	// 7. Init firewall (flushes ipset, so do BEFORE re-adding users)
	network.InitFirewall()

	// 7b. Re-add users with remaining time to ipset so they aren't fully locked out.
	//     They will still show as "paused" in the UI and need to click Connect,
	//     but their MAC gets provisioned into the ipset so the transition is instant.
	state.Users.Range(func(mac string, u *state.UserRecord) {
		if u.Time > 0 && u.IP != "" {
			network.AllowUser(mac, u.IP)
		}
	})

	// 8. Flush conntrack
	exec.Command("conntrack", "-F").Run()

	// 9. Init GPIO hardware
	hardware.Setup()

	// 10. Build Fiber app with HTML template engine
	// Go's html/template uses {{ .Variable }} — maps with string keys work naturally.
	engine := django.New("./templates", ".html")
	engine.Delims("{{", "}}")  // default, same as Jinja2

	app := fiber.New(fiber.Config{
		Views:                 engine,
		DisableStartupMessage: false,
		// Graceful shutdown is handled manually below
		StrictRouting: false,
		ServerHeader:  "PisoWifi",
	})

	app.Use(fiberrecover.New())

	// Static files
	app.Static("/static", "./static")

	// Register all routes
	api.RegisterAdminRoutes(app)
	api.RegisterPortalRoutes(app) // portal catch-all must be last

	// 11. Start background goroutines
	services.StartBackgroundTasks()

	// 12. Graceful shutdown handler
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		logger.SystemLog("System Shutting Down...")
		state.IsShuttingDown.Store(true)

		// Close all portal WebSocket connections
		state.Manager.CloseAll()

		// Turn off coin slot relay
		func() {
			defer func() { recover() }()
			hardware.TurnSlotOff()
		}()

		// Run fail_safe.sh
		failSafePath := "fail_safe.sh"
		if _, err := os.Stat(failSafePath); err == nil {
			exec.Command(failSafePath).Run()
		}

		// Graceful HTTP shutdown
		app.Shutdown()
	}()

	// 13. Start HTTP server (blocks until shutdown)
	logger.SystemLog("PisoWifi System Started Successfully!")
	if err := app.Listen(":80"); err != nil {
		logger.SystemLog(fmt.Sprintf("Server error: %v", err))
	}
}
