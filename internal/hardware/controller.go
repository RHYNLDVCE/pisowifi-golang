package hardware

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"pisowifi/internal/config"
	"pisowifi/internal/logger"
)

// ---------------------------------------------------------------------------
// sysfs GPIO helpers
// Linux kernel exposes each GPIO as files under /sys/class/gpio/gpioN/
// This replaces wiringPi — no external library, works on any Linux SBC.
// ---------------------------------------------------------------------------

func gpioPath(pin int, file string) string {
	return fmt.Sprintf("/sys/class/gpio/gpio%d/%s", pin, file)
}

// exportPin tells the kernel to expose a GPIO pin via sysfs.
func exportPin(pin int) error {
	exportPath := "/sys/class/gpio/export"
	// Check if already exported
	if _, err := os.Stat(gpioPath(pin, "value")); err == nil {
		return nil
	}
	return os.WriteFile(exportPath, []byte(strconv.Itoa(pin)), 0644)
}

func setDirection(pin int, dir string) error {
	return os.WriteFile(gpioPath(pin, "direction"), []byte(dir), 0644)
}

func writeValue(pin int, val int) error {
	return os.WriteFile(gpioPath(pin, "value"), []byte(strconv.Itoa(val)), 0644)
}

func readValue(pin int) int {
	data, err := os.ReadFile(gpioPath(pin, "value"))
	if err != nil {
		return 1 // default HIGH (safe for pull-up coin pin)
	}
	v, _ := strconv.Atoi(strings.TrimSpace(string(data)))
	return v
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Setup initialises the coin input pin and the relay output pin.
func Setup() {
	coinPin := config.CoinGPIONum
	relayPin := config.RelayGPIONum

	if err := exportPin(coinPin); err != nil {
		logger.SystemLog(fmt.Sprintf("[HW] Could not export coin GPIO %d: %v", coinPin, err))
	}
	time.Sleep(100 * time.Millisecond) // kernel needs a moment after export
	_ = setDirection(coinPin, "in")

	if err := exportPin(relayPin); err != nil {
		logger.SystemLog(fmt.Sprintf("[HW] Could not export relay GPIO %d: %v", relayPin, err))
	}
	time.Sleep(100 * time.Millisecond)
	_ = setDirection(relayPin, "out")
	_ = writeValue(relayPin, 0) // relay off by default

	logger.SystemLog(fmt.Sprintf("[HW] Hardware ready (Coin GPIO: %d, Relay GPIO: %d)", coinPin, relayPin))
}

// TurnSlotOn powers the coin slot relay HIGH.
func TurnSlotOn() {
	_ = writeValue(config.RelayGPIONum, 1)
}

// TurnSlotOff powers the relay LOW and clears the current slot user.
func TurnSlotOff() {
	_ = writeValue(config.RelayGPIONum, 0)
}

// ReadPin returns the current coin signal pin value (0 = coin pulse detected, 1 = idle).
func ReadPin() int {
	return readValue(config.CoinGPIONum)
}

// WaitForPulse blocks until one or more pulses are detected and counted.
// onDetected is called synchronously on the very first pulse edge — use it
// to capture which user's slot is open at that exact moment.
// Returns the total pulse count (0 if a stuck-LOW condition was detected).
func WaitForPulse(onDetected func()) int {
	pin := config.CoinGPIONum

	// Safety: if pin is stuck LOW, wait for it to clear (max 2 s)
	if ReadPin() == 0 {
		logger.SystemLog("[HW] Warning: Signal stuck LOW. Waiting for clear...")
		deadline := time.Now().Add(2 * time.Second)
		for ReadPin() == 0 {
			if time.Now().After(deadline) {
				logger.SystemLog("[HW] Error: Signal permanently stuck LOW. Resetting...")
				return 0
			}
			time.Sleep(10 * time.Millisecond)
		}
		logger.SystemLog("[HW] Signal cleared. Ready.")
	}

	lastState := 1

	// PHASE 1 — Wait for first pulse (HIGH → LOW edge)
	for {
		current := readValue(pin)
		if current == 0 && lastState == 1 {
			// First pulse detected
			if onDetected != nil {
				func() {
					defer func() { recover() }()
					onDetected()
				}()
			}
			break
		}
		lastState = current
		time.Sleep(1 * time.Millisecond)
	}

	// PHASE 2 — Count remaining pulses within 0.6 s silence window
	totalPulses := 1
	lastPulseTime := time.Now()
	lastState = 0

	// Wait for the first pulse to finish (go back HIGH), timeout 0.5 s
	timeout := time.Now()
	for readValue(pin) == 0 {
		if time.Since(timeout) > 500*time.Millisecond {
			break
		}
		time.Sleep(1 * time.Millisecond)
	}
	lastState = 1

	// Keep counting until 0.6 s of silence
	for time.Since(lastPulseTime) < 600*time.Millisecond {
		current := readValue(pin)
		if current == 0 && lastState == 1 {
			totalPulses++
			lastPulseTime = time.Now()

			timeout = time.Now()
			for readValue(pin) == 0 {
				if time.Since(timeout) > 500*time.Millisecond {
					break
				}
				time.Sleep(1 * time.Millisecond)
			}
			current = 1
		}
		lastState = current
		time.Sleep(1 * time.Millisecond)
	}

	return totalPulses
}
