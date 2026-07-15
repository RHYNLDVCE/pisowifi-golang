package services

import (
	"time"

	"pisowifi/internal/db"
	"pisowifi/internal/network"
	"pisowifi/internal/state"
)

// ---------------------------------------------------------------------------
// AdminService — replaces services/admin_service.py
// ---------------------------------------------------------------------------

type DailyStat struct {
	Date  string `json:"date"`
	Total int    `json:"total"`
}

type DashboardStats struct {
	Total     int         `json:"total"`
	Yesterday int         `json:"yesterday"`
	Daily     int         `json:"daily"`
	Weekly    int         `json:"weekly"`
	Monthly   int         `json:"monthly"`
	LastMonth int         `json:"last_month"`
	Yearly    int         `json:"yearly"`
	ChartData []DailyStat `json:"chart_data"`
}

func GetDashboardStats() DashboardStats {
	now := time.Now()

	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	startOfWeek := startOfDay.AddDate(0, 0, -int(now.Weekday()))
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	startOfLastMonth := startOfMonth.AddDate(0, -1, 0)
	startOfYear := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
	yesterday := startOfDay.AddDate(0, 0, -1)

	var chartData []DailyStat
	for i := 6; i >= 0; i-- {
		dayStart := startOfDay.AddDate(0, 0, -i)
		dayEnd := dayStart.AddDate(0, 0, 1)
		dayTotal := db.GetSalesRange(dayStart.Unix(), dayEnd.Unix())
		chartData = append(chartData, DailyStat{
			Date:  dayStart.Format("Mon"),
			Total: dayTotal,
		})
	}

	return DashboardStats{
		Total:     db.GetTotalSales(),
		Yesterday: db.GetSalesRange(yesterday.Unix(), startOfDay.Unix()),
		Daily:     db.GetSalesSince(startOfDay.Unix()),
		Weekly:    db.GetSalesSince(startOfWeek.Unix()),
		Monthly:   db.GetSalesSince(startOfMonth.Unix()),
		LastMonth: db.GetSalesRange(startOfLastMonth.Unix(), startOfMonth.Unix()),
		Yearly:    db.GetSalesSince(startOfYear.Unix()),
		ChartData: chartData,
	}
}

// ManageUserTime adds or subtracts time for a user. Mirrors admin_service.py.
func ManageUserTime(mac string, amount int, unit string, action string) {
	seconds := amount * 60
	if unit == "hours" {
		seconds = amount * 3600
	}
	if seconds < 0 {
		seconds = -seconds
	}

	state.Users.UpdateField(mac, func(u *state.UserRecord) {
		if action == "subtract" {
			u.Time -= seconds
		} else {
			u.Time += seconds
		}
		if u.Time < 0 {
			u.Time = 0
		}

		if u.Time == 0 && u.Status == "connected" {
			u.Status = "expired"
			u.ExpiresAt = 0
			network.BlockUser(mac, u.IP)
		} else if action == "add" && u.Time > 0 && u.Status == "expired" {
			u.Status = "connected"
			u.ExpiresAt = float64(time.Now().UnixNano())/1e9 + float64(u.Time)
			network.AllowUser(mac, u.IP)
		}

		if u.Status == "connected" {
			u.ExpiresAt = float64(time.Now().UnixNano())/1e9 + float64(u.Time)
		}
	})

	if u, ok := state.Users.Get(mac); ok {
		db.SyncUser(toDBRecord(mac, u))
	}
}

// UpdateUserStatus sets a user's status (block/unblock).
func UpdateUserStatus(mac, newStatus string) {
	state.Users.UpdateField(mac, func(u *state.UserRecord) {
		u.Status = newStatus
		if newStatus == "blocked" {
			network.BlockUser(mac, u.IP)
		}
	})
	if u, ok := state.Users.Get(mac); ok {
		db.SyncUser(toDBRecord(mac, u))
	}
}

// DeleteUser removes a user from the firewall, state, and DB.
func DeleteUser(mac string) {
	if u, ok := state.Users.Get(mac); ok {
		network.BlockUser(mac, u.IP)
	}
	state.Users.Delete(mac)
	db.DeleteUser(mac)
}
