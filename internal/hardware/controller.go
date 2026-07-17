package hardware

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"syscall"
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
	_ = os.WriteFile(gpioPath(coinPin, "edge"), []byte("both"), 0644)

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

	var initialPulseDetected bool

	// Safety: if pin is stuck LOW at the start, measure how long it takes to clear
	if ReadPin() == 0 {
		startLow := time.Now()
		deadline := time.Now().Add(2 * time.Second)
		for ReadPin() == 0 {
			if time.Now().After(deadline) {
				logger.SystemLog("[HW] Error: Signal permanently stuck LOW. Resetting...")
				return 0
			}
			time.Sleep(5 * time.Millisecond)
		}
		
		if time.Since(startLow) < 300*time.Millisecond {
			// It was a fast pulse, we just caught it mid-LOW!
			initialPulseDetected = true
		} else {
			logger.SystemLog("[HW] Warning: Signal was stuck LOW for too long, ignored.")
		}
	}

	valuePath := gpioPath(pin, "value")
	fd, err := syscall.Open(valuePath, syscall.O_RDONLY|syscall.O_NONBLOCK, 0)
	if err != nil {
		logger.SystemLog(fmt.Sprintf("[HW] Error opening GPIO value for poll: %v", err))
		time.Sleep(time.Second) // fallback sleep
		return 0
	}
	defer syscall.Close(fd)

	epfd, err := syscall.EpollCreate1(0)
	if err != nil {
		logger.SystemLog(fmt.Sprintf("[HW] Error creating epoll: %v", err))
		time.Sleep(time.Second)
		return 0
	}
	defer syscall.Close(epfd)

	event := syscall.EpollEvent{
		Events: syscall.EPOLLPRI | syscall.EPOLLERR,
		Fd:     int32(fd),
	}
	if err := syscall.EpollCtl(epfd, syscall.EPOLL_CTL_ADD, fd, &event); err != nil {
		logger.SystemLog(fmt.Sprintf("[HW] Error in epoll ctl: %v", err))
		time.Sleep(time.Second)
		return 0
	}

	events := make([]syscall.EpollEvent, 1)

	// Initial read to clear any pending interrupt
	buf := make([]byte, 2)
	syscall.Seek(fd, 0, 0)
	syscall.Read(fd, buf)

	waitForEdge := func(timeoutMs int) bool {
		n, err := syscall.EpollWait(epfd, events, timeoutMs)
		if err != nil && err != syscall.EINTR {
			return false
		}
		if n > 0 {
			// Acknowledge the interrupt so it can trigger again
			syscall.Seek(fd, 0, 0)
			syscall.Read(fd, buf)
			return true
		}
		return false
	}

	// PHASE 1 — Wait for first pulse (HIGH → LOW edge)
	if !initialPulseDetected {
		for {
			if ReadPin() == 0 {
				break
			}
			if state.IsShuttingDown.Load() {
				return 0
			}
			waitForEdge(1000)
		}
	}

	// First pulse detected
	if onDetected != nil {
		func() {
			defer func() { recover() }()
			onDetected()
		}()
	}

	// PHASE 2 — Count remaining pulses within 0.6 s silence window
	totalPulses := 1
	lastPulseTime := time.Now()

	// Wait for the first pulse to finish (go back HIGH), timeout 0.5 s
	timeout := time.Now()
	for ReadPin() == 0 {
		if time.Since(timeout) > 500*time.Millisecond {
			break
		}
		waitForEdge(10)
	}

	// Keep counting until 0.6 s of silence
	for time.Since(lastPulseTime) < 600*time.Millisecond {
		timeRemaining := int(600 - time.Since(lastPulseTime).Milliseconds())
		if timeRemaining <= 0 {
			break
		}
		
		if waitForEdge(timeRemaining) {
			if ReadPin() == 0 {
				totalPulses++
				lastPulseTime = time.Now()

				timeout = time.Now()
				for ReadPin() == 0 {
					if time.Since(timeout) > 500*time.Millisecond {
						break
					}
					waitForEdge(10)
				}
			}
		}
	}

	return totalPulses
}
