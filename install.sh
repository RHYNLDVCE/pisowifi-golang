#!/bin/bash

# PisoWifi System Installer Script
# This script installs all necessary dependencies for the PisoWifi Golang backend and React frontend.

# Check for root privileges
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (e.g. sudo ./install.sh)"
  exit 1
fi

echo "=========================================="
echo "    PisoWifi System Dependency Installer  "
echo "=========================================="

echo "[1/3] Updating system package list..."
apt-get update -y

echo "[2/3] Installing Core Linux Networking & Utilities..."
# nftables: Firewall & NAT
# iproute2: tc for QoS/SQM speed limits
# conntrack: Disconnect active sessions
# ethtool: Disable hardware offloading for SQM
# miniupnpd: Open NAT/Gaming mode
# ipset: Fallback block list for fail_safe.sh
# coreutils, procps, iputils-ping, sudo: Core system commands
apt-get install -y \
    nftables \
    iproute2 \
    conntrack \
    ethtool \
    miniupnpd \
    ipset \
    sudo \
    coreutils \
    iputils-ping \
    procps

echo "[3/3] Installing Build Tools (Go)..."
# Install Go (golang) for compiling the backend.
# Note: This uses the default distro repositories. If you need the absolute latest version,
# you may need to install Go via the official golang.org tarball.
apt-get install -y golang

echo "=========================================="
echo " Installation Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Backend: Run 'go build -o pisowifi-server cmd/server/main.go' to compile."
echo "2. Frontend: Build your React app ('npm run build') on your PC and transfer the 'admin-ui/dist' folder."
echo ""
