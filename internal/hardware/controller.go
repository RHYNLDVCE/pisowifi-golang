package hardware

import (
	"fmt"
	"time"

	"github.com/warthog618/go-gpiocdev"
	"pisowifi/internal/config"
	"pisowifi/internal/logger"
	"pisowifi/internal/state"
)

// ---------------------------------------------------------------------------
// Public API using modern libgpiod (warthog618/go-gpiocdev)
// ---------------------------------------------------------------------------

var (
	coinLine         *gpiocdev.Line
	relayLine        *gpiocdev.Line
	coinInterruptChan chan struct{}
)

// Setup initialises the coin input pin and the relay output pin.
func Setup() {
	var err error

	// Setup Relay Pin (Output + Default OFF)
	relayLine, err = gpiocdev.RequestLine(config.RelayChip, config.RelayLine, gpiocdev.AsOutput(0))
	if err != nil {
		logger.SystemLog(fmt.Sprintf("[HW] Fatal: Failed to request relay line: %v", err))
	}

	coinInterruptChan = make(chan struct{}, 1)

	// Setup Coin Pin (Input + Pull Up + Hardware Interrupts)
	coinLine, err = gpiocdev.RequestLine(
		config.CoinChip,
		config.CoinLine,
		gpiocdev.AsInput,
		gpiocdev.WithPullUp(),
		gpiocdev.WithFallingEdge,
		gpiocdev.WithEventHandler(func(evt gpiocdev.LineEvent) {
			// A true hardware interrupt just fired from the Linux Kernel!
			// Non-blocking send to wake up the Go program
			select {
			case coinInterruptChan <- struct{}{}:
			default:
			}
		}),
	)

	if err != nil {
		logger.SystemLog(fmt.Sprintf("[HW] Fatal: Failed to request coin line: %v", err))
	}

	logger.SystemLog(fmt.Sprintf("[HW] Hardware ready (Coin: %s/%d, Relay: %s/%d)", config.CoinChip, config.CoinLine, config.RelayChip, config.RelayLine))
}

// TurnSlotOn powers the coin slot relay HIGH.
func TurnSlotOn() {
	if relayLine != nil {
		_ = relayLine.SetValue(1)
	}
}

// TurnSlotOff powers the relay LOW and clears the current slot user.
func TurnSlotOff() {
	if relayLine != nil {
		_ = relayLine.SetValue(0)
	}
}

// ReadPin returns the current coin signal pin value (0 = coin pulse detected, 1 = idle).
func ReadPin() int {
	if coinLine != nil {
		v, _ := coinLine.Value()
		return v
	}
	return 1
}

// WaitForPulse blocks until one or more pulses are detected and counted.
func WaitForPulse(onDetected func()) int {
	readPinFast := func() int {
		if coinLine != nil {
			v, _ := coinLine.Value()
			return v
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

	// Drain any stale interrupts before we begin waiting
	select {
	case <-coinInterruptChan:
	default:
	}

	// PHASE 1: Wait for coin
	for {
		if state.IsShuttingDown.Load() {
			return 0
		}

		if state.GetSlotUser() == "" {
			time.Sleep(100 * time.Millisecond)
			continue
		}

		// TRUE HARDWARE INTERRUPT (0.00% CPU):
		// We use a select statement to block until the kernel wakes us up.
		select {
		case <-coinInterruptChan:
			// The Kernel interrupt handler just woke us up!
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
			goto Phase2
		case <-time.After(100 * time.Millisecond):
			// Timeout 100ms just to loop around and check IsShuttingDown and GetSlotUser again
			continue
		}
	}

Phase2:
	// PHASE 2: Count pulses
	// Now that the kernel woke us up, we fall back to a 1ms high-speed software 
	// polling loop for exactly 600ms. This prevents "Interrupt Storms" caused 
	// by dirty electrical bouncing, ensuring we perfectly debounce the signal.
	totalPulses := 1
	lastPulseTime := time.Now()
	lastState := 0

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

	// Keep listening until silence
	for time.Since(lastPulseTime) < 600*time.Millisecond {
		pinState := readPinFast()
		if pinState == 0 && lastState == 1 {
			totalPulses++
			lastPulseTime = time.Now()

			timeout := time.Now()
			for readPinFast() == 0 {
				if time.Since(timeout) > 500*time.Millisecond {
					logger.SystemLog(fmt.Sprintf("[HW] Pulse %d timeout (stuck LOW?)", totalPulses))
					break
				}
				time.Sleep(1 * time.Millisecond)
			}
			pinState = 1
		}
		lastState = pinState
		time.Sleep(1 * time.Millisecond)
	}

	return totalPulses
}
