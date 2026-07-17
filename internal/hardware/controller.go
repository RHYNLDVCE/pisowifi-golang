package hardware

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"pisowifi/internal/config"
	"pisowifi/internal/logger"
	"pisowifi/internal/state"
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

	// Enable edge interrupts for the coin pin
	_ = os.WriteFile(gpioPath(coinPin, "edge"), []byte("falling"), 0644)

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

	// Ensure edge is falling so poll() triggers precisely on HIGH->LOW
	_ = os.WriteFile(gpioPath(pin, "edge"), []byte("falling"), 0644)

	valuePath := gpioPath(pin, "value")
	fd, err := os.Open(valuePath)
	if err != nil {
		logger.SystemLog(fmt.Sprintf("[HW] Error opening GPIO value for poll: %v", err))
		time.Sleep(time.Second) // fallback sleep
		return 0
	}
	defer fd.Close()

	buf := make([]byte, 1)
	readPinFast := func() int {
		_, err := fd.Seek(0, 0)
		if err != nil {
			return 1
		}
		n, err := fd.Read(buf)
		if err != nil || n == 0 {
			return 1
		}
		if buf[0] == '0' {
			return 0
		}
		return 1
	}

	// SAFETY: If pin is stuck LOW (0), wait for it to clear.
	if readPinFast() == 0 {
		logger.SystemLog("   [Warning] Signal Stuck LOW. Waiting for clear...")
		timeout := time.Now()
		for readPinFast() == 0 {
			if time.Since(timeout) > 2*time.Second {
				logger.SystemLog("   [Error] Signal permanently stuck LOW. Resetting...")
				return 0
			}
			time.Sleep(10 * time.Millisecond)
		}
		logger.SystemLog("   [OK] Signal Cleared. Ready.")
	}

	logger.SystemLog("[HW] Entering PHASE 1 (Idle wait)")

	lastState := 1

	// PHASE 1: Wait for coin
	for {
		if state.IsShuttingDown.Load() {
			return 0
		}
		pinState := readPinFast()
		if pinState == 0 && lastState == 1 {
			logger.SystemLog("[HW] First pulse detected (HIGH->LOW)!")
			if onDetected != nil {
				func() {
					defer func() {
						if r := recover(); r != nil {
							logger.SystemLog(fmt.Sprintf("Callback Error: %v", r))
						}
					}()
					onDetected()
				}()
			}
			break
		}
		lastState = pinState
		// 10ms polling ensures fast detection while dropping CPU idle usage to virtually 0%
		time.Sleep(10 * time.Millisecond)
	}

	logger.SystemLog("[HW] Entering PHASE 2 (Counting pulses)")
	// PHASE 2: Count pulses
	totalPulses := 1
	lastPulseTime := time.Now()
	lastState = 0

	// Wait for the pulse to finish (go back HIGH) with Timeout
	timeout := time.Now()
	for readPinFast() == 0 {
		if time.Since(timeout) > 500*time.Millisecond {
			logger.SystemLog("[HW] Pulse finish timeout (stuck LOW?)")
			break
		}
		time.Sleep(1 * time.Millisecond)
	}
	lastState = 1
	logger.SystemLog(fmt.Sprintf("[HW] Pulse 1 finished. Duration: %v", time.Since(timeout)))

	// Keep listening until silence
	for time.Since(lastPulseTime) < 600*time.Millisecond {
		pinState := readPinFast()
		if pinState == 0 && lastState == 1 {
			totalPulses++
			pulseGap := time.Since(lastPulseTime)
			lastPulseTime = time.Now()
			logger.SystemLog(fmt.Sprintf("[HW] Pulse %d started! Gap: %v", totalPulses, pulseGap))

			timeout := time.Now()
			for readPinFast() == 0 {
				if time.Since(timeout) > 500*time.Millisecond {
					logger.SystemLog(fmt.Sprintf("[HW] Pulse %d timeout (stuck LOW?)", totalPulses))
					break
				}
				time.Sleep(1 * time.Millisecond)
			}
			pinState = 1
			logger.SystemLog(fmt.Sprintf("[HW] Pulse %d finished. Duration: %v", totalPulses, time.Since(timeout)))
		}
		lastState = pinState
		time.Sleep(1 * time.Millisecond)
	}

	logger.SystemLog(fmt.Sprintf("[HW] PHASE 2 Complete. Total Pulses: %d", totalPulses))
	return totalPulses
}
