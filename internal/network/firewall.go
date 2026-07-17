package network

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"text/template"
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
	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			logger.SystemLog(fmt.Sprintf("[Firewall Timeout] %s", strings.Join(args, " ")))
		} else {
			// conntrack -D returns exit status 1 if no connections were found. This is harmless.
			if strings.Contains(args[0], "conntrack") && len(args) > 1 && args[1] == "-D" && strings.Contains(err.Error(), "exit status 1") {
				return
			}
			logger.SystemLog(fmt.Sprintf("[Firewall Error] %s: %v", strings.Join(args, " "), err))
		}
	}
}

func runTcCmd(args []string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, args[0], args[1:]...)
	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			logger.SystemLog(fmt.Sprintf("[TC Timeout] %s", strings.Join(args, " ")))
		} else {
			// Exit status 2 on 'del' commands just means the rule didn't exist to be deleted.
			isDelError := false
			for _, arg := range args {
				if arg == "del" {
					isDelError = true
					break
				}
			}
			if isDelError && strings.Contains(err.Error(), "exit status 2") {
				return // harmless cleanup error, ignore
			}
			logger.SystemLog(fmt.Sprintf("[TC Error] %s: %v", strings.Join(args, " "), err))
		}
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

	// Wipe all old iptables and nftables garbage for a clean slate
	runCmdStr("nft flush ruleset")

	// Manage UPnP (miniupnpd) for Open NAT
	if cfg.OpenNATEnabled {
		logger.SystemLog("Open NAT (Gaming Mode) Enabled. Starting miniupnpd...")
		runCmdStr("systemctl restart miniupnpd")
	} else {
		runCmdStr("systemctl stop miniupnpd")
	}

	// Native nftables ruleset template
	const nftablesTmpl = `
# Fix miniupnpd's aggressive drop policy on the forward chain
add table inet filter
add chain inet filter forward { type filter hook forward priority filter; policy accept; }

add table ip pisowifi
flush table ip pisowifi
table ip pisowifi {
	set authorized_users {
		type ether_addr
		size 65535
		flags dynamic
		counter
	}

	chain prerouting {
		type filter hook prerouting priority mangle; policy accept;
		{{if .UDPPriorityEnabled}}
		udp sport { 5000-5500, 7074-7750, 10000-10009, 30000-30300 } meta mark set 0x63
		udp dport { 5000-5500, 7074-7750, 10000-10009, 30000-30300 } meta mark set 0x63
		meta mark 0x63 ip dscp set cs4
		udp length <= 256 meta mark set 0x63
		udp length <= 256 ip dscp set ef
		tcp dport 6881-6889 ip dscp set cs1
		udp dport 6881-6889 ip dscp set cs1
		{{end}}
	}

	chain forward_mangle {
		type filter hook forward priority mangle; policy accept;
		tcp flags syn / syn,rst tcp option maxseg size set 1300
	}

	chain postrouting_mangle {
		type filter hook postrouting priority mangle; policy accept;
		{{if .CustomTTL}}
		oifname "{{.LAN}}" ip ttl set {{.CustomTTL}}
		{{end}}
	}

	chain filter_input {
		type filter hook input priority filter; policy accept;
		ct state related,established accept
		iifname "{{.LAN}}" udp sport 67-68 udp dport 67-68 accept
		iifname "lo" accept
	}

	chain filter_forward {
		type filter hook forward priority filter; policy drop;
		ct state related,established accept
		iifname "{{.LAN}}" ether saddr @authorized_users accept
		oifname "{{.LAN}}" ether daddr @authorized_users accept
		iifname "{{.LAN}}" udp dport 53 accept
		iifname "{{.LAN}}" tcp dport 53 accept
		iifname "{{.LAN}}" ether saddr != @authorized_users tcp dport 443 drop
	}

	chain nat_prerouting {
		type nat hook prerouting priority dstnat; policy accept;
		iifname "{{.LAN}}" ether saddr @authorized_users udp dport 53 dnat to 1.1.1.1:53
		iifname "{{.LAN}}" ether saddr @authorized_users tcp dport 53 dnat to 1.1.1.1:53
		iifname "{{.LAN}}" ether saddr != @authorized_users udp dport 53 dnat to 10.0.0.1:53
		iifname "{{.LAN}}" ether saddr != @authorized_users tcp dport 53 dnat to 10.0.0.1:53
		iifname "{{.LAN}}" ether saddr != @authorized_users tcp dport 80 dnat to 10.0.0.1:80
		iifname "{{.LAN}}" ether saddr != @authorized_users tcp dport 443 dnat to 10.0.0.1:80
	}

	chain nat_postrouting {
		type nat hook postrouting priority srcnat; policy accept;
		oifname "{{.WAN}}" masquerade
	}
}
`
	tmpl, err := template.New("nft").Parse(nftablesTmpl)
	if err != nil {
		logger.SystemLog(fmt.Sprintf("[FIREWALL] Template parse error: %v", err))
	} else {
		var buf bytes.Buffer
		tmpl.Execute(&buf, map[string]interface{}{
			"LAN":                lan,
			"WAN":                wan,
			"CustomTTL":          cfg.CustomTTL,
			"UDPPriorityEnabled": cfg.UDPPriorityEnabled,
		})

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		cmd := exec.CommandContext(ctx, "nft", "-f", "-")
		cmd.Stdin = &buf
		if err := cmd.Run(); err != nil {
			logger.SystemLog(fmt.Sprintf("[FIREWALL] nft apply error: %v", err))
		}
	}

	// TC
	runTcStr(fmt.Sprintf("tc qdisc del dev %s root", lan))
	runTcStr(fmt.Sprintf("tc qdisc del dev %s ingress", lan))
	runTcStr(fmt.Sprintf("tc qdisc add dev %s root handle 1: htb default 10", lan))
	runTcStr(fmt.Sprintf("tc class add dev %s parent 1: classid 1:ffff htb rate 1000mbit", lan))
	runTcStr(fmt.Sprintf("tc qdisc add dev %s ingress", lan))
	
	// SQM
	runTcStr(fmt.Sprintf("tc qdisc del dev %s root", wan)) // Clear any existing WAN SQM
	runTcStr("ip link del ifb0") // Clear any existing IFB
	
	if cfg.SQMEnabled {
		// Upload (WAN Egress)
		runTcStr(fmt.Sprintf("tc qdisc add dev %s root cake bandwidth %dmbit diffserv4 nat wash", wan, cfg.SQMUploadMbps))
		
		// Download (WAN Ingress -> IFB0 Egress)
		runCmdStr("ip link add name ifb0 type ifb")
		runCmdStr("ip link set dev ifb0 up")
		runTcStr(fmt.Sprintf("tc qdisc del dev %s ingress", wan)) // clear existing ingress
		runTcStr(fmt.Sprintf("tc qdisc add dev %s handle ffff: ingress", wan))
		runTcStr(fmt.Sprintf("tc filter add dev %s parent ffff: protocol all u32 match u32 0 0 action mirred egress redirect dev ifb0", wan))
		runTcStr(fmt.Sprintf("tc qdisc add dev ifb0 root cake bandwidth %dmbit diffserv4 nat wash", cfg.SQMDownloadMbps))
		logger.SystemLog(fmt.Sprintf("SQM Enabled: Upload %d Mbps, Download %d Mbps", cfg.SQMUploadMbps, cfg.SQMDownloadMbps))
	} else {
		logger.SystemLog("SQM Disabled.")
	}

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
	// Equivalent to: ipset del authorized_users <mac> -exist
	runCmd([]string{"nft", "delete", "element", "ip", "pisowifi", "authorized_users", "{", mac, "}"})

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
	// Equivalent to: ipset add authorized_users <mac> -exist
	runCmd([]string{"nft", "add", "element", "ip", "pisowifi", "authorized_users", "{", mac, "}"})
	if ip != "" {
		ApplySpeedLimit(ip)
	}
}

// ---------------------------------------------------------------------------
// Traffic accounting
// ---------------------------------------------------------------------------

var trafficLineRe = regexp.MustCompile(`packets\s+(\d+)\s+bytes\s+(\d+)`)

type nftJSONData struct {
	Nftables []map[string]interface{} `json:"nftables"`
}

func GetAllTraffic() map[string][2]int64 {
	out, err := exec.Command("nft", "-j", "list", "set", "ip", "pisowifi", "authorized_users").Output()
	if err != nil {
		return nil
	}

	var data nftJSONData
	if err := json.Unmarshal(out, &data); err != nil {
		return nil
	}

	result := make(map[string][2]int64)
	for _, item := range data.Nftables {
		if setWrap, ok := item["set"].(map[string]interface{}); ok {
			if name, _ := setWrap["name"].(string); name == "authorized_users" {
				if elems, ok := setWrap["elem"].([]interface{}); ok {
					for _, e := range elems {
						if elemMap, ok := e.(map[string]interface{}); ok {
							if elemWrap, ok := elemMap["elem"].(map[string]interface{}); ok {
								val, _ := elemWrap["val"].(string)
								counter, ok := elemWrap["counter"].(map[string]interface{})
								if ok && val != "" {
									pkts, _ := counter["packets"].(float64)
									bytes, _ := counter["bytes"].(float64)
									result[strings.ToLower(val)] = [2]int64{int64(bytes), int64(pkts)}
								}
							}
						}
					}
				}
			}
		}
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
