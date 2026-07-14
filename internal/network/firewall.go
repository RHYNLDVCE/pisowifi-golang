package network

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"

	"pisowifi/internal/config"
	"pisowifi/internal/logger"
	"pisowifi/internal/state"
)

const ipsetName = "authorized_users"

// conntrackPath is resolved once at startup.
var conntrackPath string

func init() {
	for _, p := range []string{"/usr/sbin/conntrack", "/usr/bin/conntrack"} {
		if _, err := os.Stat(p); err == nil {
			conntrackPath = p
			break
		}
	}
	if conntrackPath == "" {
		if p, err := exec.LookPath("conntrack"); err == nil {
			conntrackPath = p
		}
	}
}

// ---------------------------------------------------------------------------
// Shell helpers
// ---------------------------------------------------------------------------

func runCmd(args []string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, args[0], args[1:]...)
	if err := cmd.Run(); err != nil && ctx.Err() != nil {
		logger.SystemLog(fmt.Sprintf("[Firewall Timeout] %s", strings.Join(args, " ")))
	}
}

func runTcCmd(args []string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, args[0], args[1:]...)
	if err := cmd.Run(); err != nil && ctx.Err() != nil {
		logger.SystemLog(fmt.Sprintf("[TC Timeout] %s", strings.Join(args, " ")))
	}
}

func runSysctl(param, value string) {
	cmd := exec.Command("sysctl", "-w", fmt.Sprintf("%s=%s", param, value))
	cmd.Stdout = nil
	cmd.Stderr = nil
	_ = cmd.Run()
}

func runCmdStr(s string) {
	runCmd(strings.Fields(s))
}

func runTcStr(s string) {
	runTcCmd(strings.Fields(s))
}

// ---------------------------------------------------------------------------
// UID helper (mirrors Python get_uid)
// ---------------------------------------------------------------------------

func getUID(ip string) int {
	parts := strings.Split(ip, ".")
	if len(parts) != 4 {
		return 0
	}
	var c, d int
	fmt.Sscan(parts[2], &c)
	fmt.Sscan(parts[3], &d)
	return c*256 + d
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

// InitFirewall runs all iptables, sysctl, ipset, and tc setup commands.
func InitFirewall() {
	logger.SystemLog("Initializing Starlink-Optimized Firewall (IPSet + TC + Cloudflare DNS)...")

	cfg := config.Get()
	lan := config.LANInterface
	wan := config.WANInterface

	// Kernel tuning
	runSysctl("net.core.default_qdisc", "fq")
	runSysctl("net.ipv4.tcp_congestion_control", "bbr")
	runSysctl("net.core.rmem_max", "16777216")
	runSysctl("net.core.wmem_max", "16777216")
	runSysctl("net.core.rmem_default", "1048576")
	runSysctl("net.core.wmem_default", "1048576")
	runSysctl("net.ipv4.tcp_rmem", "4096 87380 16777216")
	runSysctl("net.ipv4.tcp_wmem", "4096 65536 16777216")
	runSysctl("net.core.netdev_max_backlog", "5000")
	runSysctl("net.ipv4.tcp_sack", "1")
	runSysctl("net.ipv4.tcp_timestamps", "1")
	runSysctl("net.ipv4.tcp_fastopen", "3")
	runSysctl("net.ipv4.tcp_tw_reuse", "1")
	runSysctl("net.ipv4.tcp_fin_timeout", "15")
	runSysctl("net.ipv4.ip_local_port_range", "1024 65535")
	runSysctl("net.netfilter.nf_conntrack_max", "65536")
	runSysctl("net.netfilter.nf_conntrack_tcp_timeout_established", "1800")
	runSysctl("net.netfilter.nf_conntrack_udp_timeout", "30")
	runSysctl("net.netfilter.nf_conntrack_udp_timeout_stream", "60")
	runSysctl("net.ipv4.ip_forward", "1")
	runSysctl("net.ipv6.conf.all.disable_ipv6", "1")
	runSysctl("net.ipv6.conf.default.disable_ipv6", "1")
	runSysctl("net.ipv4.tcp_ecn", "0")

	// Hardware offload disable
	exec.Command("ethtool", "-K", lan, "tso", "off", "gso", "off", "gro", "off", "sg", "off").Run()

	// IPSet
	runCmdStr(fmt.Sprintf("ipset create %s hash:mac hashsize 1024 maxelem 65535 counters -exist", ipsetName))
	runCmdStr(fmt.Sprintf("ipset flush %s", ipsetName))

	// iptables rules
	cmds := []string{
		"iptables -F",
		"iptables -t nat -F",
		"iptables -t mangle -F",
		"iptables -I INPUT 1 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT",
		"iptables -I FORWARD 1 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT",
		"iptables -t mangle -A PREROUTING -p udp -m multiport --sports 5000:5500,7074:7750,10000:10009,30000:30300 -j MARK --set-mark 99",
		"iptables -t mangle -A PREROUTING -p udp -m multiport --dports 5000:5500,7074:7750,10000:10009,30000:30300 -j MARK --set-mark 99",
		"iptables -t mangle -A PREROUTING -p udp -m multiport --dports 3478,3479,5349,19302 -j DSCP --set-dscp-class EF",
		"iptables -t mangle -A PREROUTING -p tcp -m multiport --dports 3478,3479,5349 -j DSCP --set-dscp-class EF",
		"iptables -t mangle -A PREROUTING -m mark --mark 99 -j DSCP --set-dscp-class CS4",
		"iptables -t mangle -A PREROUTING -p tcp -m multiport --dports 6881:6889 -j DSCP --set-dscp-class CS1",
		"iptables -t mangle -A PREROUTING -p udp -m multiport --dports 6881:6889 -j DSCP --set-dscp-class CS1",
		"iptables -P FORWARD DROP",
		"iptables -P INPUT ACCEPT",
		fmt.Sprintf("iptables -A INPUT -i %s -p udp --dport 67:68 --sport 67:68 -j ACCEPT", lan),
		fmt.Sprintf("iptables -A FORWARD -i %s -m set --match-set %s src -j ACCEPT", lan, ipsetName),
		fmt.Sprintf("iptables -A FORWARD -o %s -m set --match-set %s dst -j ACCEPT", lan, ipsetName),
		"iptables -A INPUT -i lo -j ACCEPT",
		fmt.Sprintf("iptables -A FORWARD -i %s -p udp --dport 53 -j ACCEPT", lan),
		fmt.Sprintf("iptables -A FORWARD -i %s -p tcp --dport 53 -j ACCEPT", lan),
		fmt.Sprintf("iptables -t nat -A PREROUTING -m set --match-set %s src -p udp --dport 53 -m statistic --mode nth --every 2 --packet 0 -j DNAT --to-destination 1.1.1.1:53", ipsetName),
		fmt.Sprintf("iptables -t nat -A PREROUTING -m set --match-set %s src -p udp --dport 53 -j DNAT --to-destination 1.0.0.1:53", ipsetName),
		fmt.Sprintf("iptables -t nat -A PREROUTING -m set --match-set %s src -p tcp --dport 53 -m statistic --mode nth --every 2 --packet 0 -j DNAT --to-destination 1.1.1.1:53", ipsetName),
		fmt.Sprintf("iptables -t nat -A PREROUTING -m set --match-set %s src -p tcp --dport 53 -j DNAT --to-destination 1.0.0.1:53", ipsetName),
		fmt.Sprintf("iptables -t nat -A PREROUTING -i %s -m set ! --match-set %s src -p udp --dport 53 -j DNAT --to-destination 10.0.0.1:53", lan, ipsetName),
		fmt.Sprintf("iptables -t nat -A PREROUTING -i %s -m set ! --match-set %s src -p tcp --dport 53 -j DNAT --to-destination 10.0.0.1:53", lan, ipsetName),
		fmt.Sprintf("iptables -t nat -A PREROUTING -i %s -m set ! --match-set %s src -p tcp --dport 80 -j DNAT --to-destination 10.0.0.1:80", lan, ipsetName),
		fmt.Sprintf("iptables -A FORWARD -i %s -m set ! --match-set %s src -p tcp --dport 443 -j DROP", lan, ipsetName),
		"iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1300",
		fmt.Sprintf("iptables -t mangle -A POSTROUTING -o %s -j TTL --ttl-set 1", lan),
		fmt.Sprintf("iptables -t nat -A POSTROUTING -o %s -j MASQUERADE", wan),
	}
	for _, c := range cmds {
		runCmdStr(c)
	}

	// TC
	runTcStr(fmt.Sprintf("tc qdisc del dev %s root", lan))
	runTcStr(fmt.Sprintf("tc qdisc del dev %s ingress", lan))
	runTcStr(fmt.Sprintf("tc qdisc add dev %s root handle 1: htb default 10", lan))
	runTcStr(fmt.Sprintf("tc class add dev %s parent 1: classid 1:ffff htb rate 1000mbit", lan))
	runTcStr(fmt.Sprintf("tc qdisc add dev %s ingress", lan))
	runTcStr(fmt.Sprintf("tc qdisc del dev %s root", wan))
	runTcStr(fmt.Sprintf("tc qdisc add dev %s root cake bandwidth %dmbit diffserv4 nat wash", wan, cfg.WANUploadMbps))

	logger.SystemLog("Firewall Initialized.")
}

// ---------------------------------------------------------------------------
// Speed limits
// ---------------------------------------------------------------------------

func RemoveSpeedLimit(ip string) {
	if ip == "" {
		return
	}
	uid := getUID(ip)
	if uid == 0 {
		return
	}
	lan := config.LANInterface
	runTcStr(fmt.Sprintf("tc class del dev %s parent 1:ffff classid 1:%x", lan, uid))
	runTcStr(fmt.Sprintf("tc filter del dev %s protocol ip parent 1:0 prio %d", lan, uid))
	runTcStr(fmt.Sprintf("tc filter del dev %s protocol ip parent ffff: prio %d", lan, uid))
}

func ApplySpeedLimit(ip string) {
	if ip == "" {
		return
	}
	RemoveSpeedLimit(ip)

	cfg := config.Get()
	if !cfg.SpeedLimitEnabled {
		return
	}

	uid := getUID(ip)
	if uid == 0 {
		return
	}
	lan := config.LANInterface
	speed := cfg.GlobalSpeedLimit
	speedStr := fmt.Sprintf("%dmbit", speed)
	uploadKbps := speed * 1024

	runTcStr(fmt.Sprintf("tc class add dev %s parent 1:ffff classid 1:%x htb rate %s ceil %s burst 15k cburst 15k", lan, uid, speedStr, speedStr))

	if cfg.GamingModeEnabled {
		runTcStr(fmt.Sprintf("tc qdisc add dev %s parent 1:%x handle %x: cake bandwidth %s diffserv4", lan, uid, uid, speedStr))
	} else {
		runTcStr(fmt.Sprintf("tc qdisc add dev %s parent 1:%x handle %x: cake bandwidth %s", lan, uid, uid, speedStr))
	}
	runTcStr(fmt.Sprintf("tc filter add dev %s protocol ip parent 1:0 prio %d u32 match ip dst %s flowid 1:%x", lan, uid, ip, uid))
	runTcStr(fmt.Sprintf("tc filter add dev %s parent ffff: protocol ip prio %d u32 match ip src %s police rate %dkbit burst 12k drop flowid :1", lan, uid, ip, uploadKbps))
}

func RefreshAllLimits() {
	lan := config.LANInterface
	runTcStr(fmt.Sprintf("tc qdisc del dev %s ingress", lan))
	runTcStr(fmt.Sprintf("tc qdisc add dev %s ingress", lan))
	state.Users.Range(func(mac string, u *state.UserRecord) {
		if u.Status == "connected" && u.IP != "" {
			RemoveSpeedLimit(u.IP)
			ApplySpeedLimit(u.IP)
		}
	})
}

// ---------------------------------------------------------------------------
// Block / Allow
// ---------------------------------------------------------------------------

func BlockUser(mac, ip string) {
	runCmd([]string{"ipset", "del", ipsetName, mac, "-exist"})

	resolvedIP := ip
	if resolvedIP == "" {
		resolvedIP = resolveIPFromARP(mac)
	}
	if resolvedIP != "" {
		RemoveSpeedLimit(resolvedIP)
		if conntrackPath != "" {
			runCmd([]string{conntrackPath, "-D", "-s", resolvedIP})
			runCmd([]string{conntrackPath, "-D", "-d", resolvedIP})
			logger.SystemLog(fmt.Sprintf("[FIREWALL] Conntrack flushed for IP %s", resolvedIP))
		} else {
			logger.SystemLog("[FIREWALL] CRITICAL: conntrack not found!")
		}
	} else {
		logger.SystemLog(fmt.Sprintf("[FIREWALL] WARNING: Could not resolve IP for MAC %s", mac))
	}
}

func AllowUser(mac, ip string) {
	runCmd([]string{"ipset", "add", ipsetName, mac, "-exist"})
	if ip != "" {
		ApplySpeedLimit(ip)
	}
}

// ---------------------------------------------------------------------------
// Traffic accounting
// ---------------------------------------------------------------------------

var trafficLineRe = regexp.MustCompile(`packets\s+(\d+)\s+bytes\s+(\d+)`)

func GetAllTraffic() map[string][2]int64 {
	out, err := exec.Command("ipset", "list", ipsetName).Output()
	if err != nil {
		return nil
	}
	result := make(map[string][2]int64)
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}
		// Line format: <MAC> packets <N> bytes <N>
		pktsIdx := -1
		bytesIdx := -1
		for i, f := range fields {
			if f == "packets" {
				pktsIdx = i + 1
			}
			if f == "bytes" {
				bytesIdx = i + 1
			}
		}
		if pktsIdx < 0 || bytesIdx < 0 {
			continue
		}
		mac := strings.ToLower(fields[0])
		var pkts, bytes int64
		fmt.Sscan(fields[pktsIdx], &pkts)
		fmt.Sscan(fields[bytesIdx], &bytes)
		result[mac] = [2]int64{bytes, pkts}
	}
	return result
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func resolveIPFromARP(mac string) string {
	data, err := os.ReadFile("/proc/net/arp")
	if err != nil {
		return ""
	}
	for _, line := range strings.Split(string(data), "\n") {
		if strings.Contains(strings.ToLower(line), strings.ToLower(mac)) {
			parts := strings.Fields(line)
			if len(parts) > 0 {
				return parts[0]
			}
		}
	}
	return ""
}
