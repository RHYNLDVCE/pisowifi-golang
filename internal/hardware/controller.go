package hardware

/*
#cgo LDFLAGS: -lwiringPi
#include <wiringPi.h>
*/
import "C"

import (
	"fmt"
	"time"

	"pisowifi/internal/config"
	"pisowifi/internal/logger"
	"pisowifi/internal/state"
)

// ---------------------------------------------------------------------------
// Public API using WiringOP CGO wrapper
// ---------------------------------------------------------------------------

// Setup initialises the coin input pin and the relay output pin using wiringOP.
func Setup() {
	// Initialize wiringPi using physical pin numbers (1-40)
	C.wiringPiSetupPhys()

	coinPin := C.int(config.CoinPinPhys)
	relayPin := C.int(config.RelayPinPhys)

	// Setup Coin Pin (Input + Pull Up)
	// 0 = INPUT, 2 = PUD_UP
	C.pinMode(coinPin, 0)
	C.pullUpDnControl(coinPin, 2)

	// Setup Relay Pin (Output + Default OFF)
	// 1 = OUTPUT
	C.pinMode(relayPin, 1)
	C.digitalWrite(relayPin, 0)

	logger.SystemLog(fmt.Sprintf("[HW] Hardware ready (Coin Pin: %d, Relay Pin: %d)", config.CoinPinPhys, config.RelayPinPhys))
}

// TurnSlotOn powers the coin slot relay HIGH.
func TurnSlotOn() {
	C.digitalWrite(C.int(config.RelayPinPhys), 1)
}

// TurnSlotOff powers the relay LOW and clears the current slot user.
func TurnSlotOff() {
	C.digitalWrite(C.int(config.RelayPinPhys), 0)
}

// ReadPin returns the current coin signal pin value (0 = coin pulse detected, 1 = idle).
func ReadPin() int {
	return int(C.digitalRead(C.int(config.CoinPinPhys)))
}

// WaitForPulse blocks until one or more pulses are detected and counted.
// onDetected is called synchronously on the very first pulse edge — use it
// to capture which user's slot is open at that exact moment.
// Returns the total pulse count (0 if a stuck-LOW condition was detected).
func WaitForPulse(onDetected func()) int {
	readPinFast := func() int {
		return int(C.digitalRead(C.int(config.CoinPinPhys)))
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
		
		// 10ms polling (100Hz) is fast enough to catch any coin but avoids CGO context switch overhead, dropping CPU back to 0.1%
		time.Sleep(10 * time.Millisecond)
	}

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

	return totalPulses
}
