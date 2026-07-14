package config

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
)

// ---------------------------------------------------------------------------
// Hardware constants — adjust these to match your Orange Pi board wiring
// ---------------------------------------------------------------------------

// LANInterface and WANInterface are the Linux interface names for the LAN
// (the side clients connect to) and WAN (the internet uplink). These are set
// from the .env file at startup via ReloadSecrets(). Defaults match a typical
// Orange Pi bridge setup but MUST be changed to match your hardware.
var (
	LANInterface = "br0"
	WANInterface  = "eth0"
)

const (
	// sysfs GPIO numbers for your Orange Pi board.
	// Physical pin 3 on the 40-pin header = GPIO 12 on most Orange Pi boards.
	// Physical pin 5 on the 40-pin header = GPIO 11 on most Orange Pi boards.
	// Run `gpio readall` on your board to confirm the correct numbers.
	CoinGPIONum  = 12 // coin signal input pin
	RelayGPIONum = 11 // relay / slot power output pin

	PulseValue = 1 // coins credited per physical pulse
)

// ---------------------------------------------------------------------------
// Secrets loaded from .env (set by cmd/server/main.go via godotenv)
// ---------------------------------------------------------------------------

var (
	SecretKey     string
	AdminUsername string
	AdminPassword string
)

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ReloadSecrets reads SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD from the
// environment (called after godotenv.Load so .env values are in os.Getenv).
func ReloadSecrets() {
	SecretKey = getEnv("SECRET_KEY", "unsafe_default_change_me")
	AdminUsername = getEnv("ADMIN_USERNAME", "admin")
	AdminPassword = getEnv("ADMIN_PASSWORD", "admin123")
	LANInterface = getEnv("LAN_INTERFACE", "br0")
	WANInterface = getEnv("WAN_INTERFACE", "eth0")
}

// ---------------------------------------------------------------------------
// AppConfig — mirrors config.json exactly
// ---------------------------------------------------------------------------

type RestartSchedule struct {
	Enabled bool   `json:"enabled"`
	Time    string `json:"time"`
}

type PromoItem struct {
	ID      int64   `json:"id"`
	Name    string  `json:"name"`
	Cost    float64 `json:"cost"`
	Minutes int     `json:"minutes"`
}

type AppConfig struct {
	WANUploadMbps          int                `json:"wan_upload_mbps"`
	WANSpeedMbps           int                `json:"wan_speed_mbps"`
	SlotTimeout            int                `json:"slot_timeout"`
	SlotExpiryTimestamp    float64            `json:"slot_expiry_timestamp"`
	InactiveTimeout        int                `json:"inactive_timeout"`
	AutoPauseEnabled       bool               `json:"auto_pause_enabled"`
	SpeedLimitEnabled      bool               `json:"speed_limit_enabled"`
	GlobalSpeedLimit       int                `json:"global_speed_limit"`
	GamingModeEnabled      bool               `json:"gaming_mode_enabled"`
	InactivePacketThreshold int               `json:"inactive_packet_threshold"`
	CoinRates              string             `json:"coin_rates"`
	PulseValue             int                `json:"pulse_value"`
	RestartSchedule        RestartSchedule    `json:"restart_schedule"`
	PointsEnabled          bool               `json:"points_enabled"`
	CoinPointMap           map[string]float64 `json:"coin_point_map"`
	PointPromos            []PromoItem        `json:"point_promos"`
	InactiveBytesThreshold int                `json:"inactive_bytes_threshold"`
	BannerText             string             `json:"banner_text"`
	BannerLink             string             `json:"banner_link"`
	BannerOrder            []string           `json:"banner_order"`
	FreeTimeEnabled        bool               `json:"free_time_enabled"`
	FreeTimeDuration       int                `json:"free_time_duration"`
	SoundInsert            string             `json:"sound_insert"`
	SoundCoin              string             `json:"sound_coin"`
	CustomDeviceNames      map[string]string  `json:"custom_device_names,omitempty"`
}

// Defaults mirror state.py defaults
var defaultConfig = AppConfig{
	WANUploadMbps:           70,
	WANSpeedMbps:            100,
	SlotTimeout:             30,
	SlotExpiryTimestamp:     0,
	InactiveTimeout:         900,
	AutoPauseEnabled:        true,
	SpeedLimitEnabled:       false,
	GlobalSpeedLimit:        5,
	GamingModeEnabled:       false,
	InactivePacketThreshold: 5,
	CoinRates:               "1:10,5:60,10:180,20:300",
	PulseValue:              1,
	RestartSchedule:         RestartSchedule{Enabled: false, Time: "03:00"},
	PointsEnabled:           true,
	CoinPointMap:            map[string]float64{"1": 0.5, "5": 1, "10": 3, "20": 5},
	PointPromos:             []PromoItem{{ID: 1, Name: "3 Hours Free", Cost: 20, Minutes: 180}},
	InactiveBytesThreshold:  500,
	BannerText:              "",
	BannerLink:              "",
	BannerOrder:             []string{},
	FreeTimeEnabled:         false,
	FreeTimeDuration:        5,
	SoundInsert:             "insert_coin_sound.mp3",
	SoundCoin:               "coin-recieved.mp3",
	CustomDeviceNames:       map[string]string{},
}

const configFile = "config.json"

var (
	mu      sync.RWMutex
	current AppConfig
)

// Get returns a copy of the current config (safe to read without holding the lock).
func Get() AppConfig {
	mu.RLock()
	defer mu.RUnlock()
	return current
}

// Update merges fields into the current config. Caller must call Save() afterward.
func Update(fn func(*AppConfig)) {
	mu.Lock()
	defer mu.Unlock()
	fn(&current)
}

// Load reads config.json into memory, merging over defaults.
func Load() {
	mu.Lock()
	defer mu.Unlock()
	current = defaultConfig

	data, err := os.ReadFile(configFile)
	if err != nil {
		fmt.Println("[Config] config.json not found, using defaults.")
		return
	}
	if err := json.Unmarshal(data, &current); err != nil {
		fmt.Printf("[Config] config.json corrupt: %v — using defaults.\n", err)
		_ = os.Rename(configFile, configFile+".corrupt")
		current = defaultConfig
	}
	// Ensure maps are never nil
	if current.CoinPointMap == nil {
		current.CoinPointMap = defaultConfig.CoinPointMap
	}
	if current.CustomDeviceNames == nil {
		current.CustomDeviceNames = map[string]string{}
	}
	fmt.Println("[Config] Loaded from config.json.")
}

// Save atomically writes the current config to config.json.
func Save() error {
	mu.RLock()
	data, err := json.MarshalIndent(current, "", "    ")
	mu.RUnlock()
	if err != nil {
		return fmt.Errorf("config marshal: %w", err)
	}

	tmp := configFile + ".tmp"
	f, err := os.Create(tmp)
	if err != nil {
		return fmt.Errorf("config create tmp: %w", err)
	}
	if _, err = f.Write(data); err != nil {
		f.Close()
		return err
	}
	if err = f.Sync(); err != nil {
		f.Close()
		return err
	}
	f.Close()
	return os.Rename(tmp, configFile)
}
