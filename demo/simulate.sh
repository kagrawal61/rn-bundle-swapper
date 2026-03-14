#!/usr/bin/env bash
# Simulates rn-bundle-swapper android output for demo recording.
# This script mimics the real CLI output with realistic timing.

set -e

CYAN=$'\033[0;36m'
GREEN=$'\033[0;32m'
GRAY=$'\033[0;90m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

spin() {
  local msg="$1"
  local duration="$2"
  local chars='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local end=$((SECONDS + duration))
  while [ $SECONDS -lt $end ]; do
    for (( i=0; i<${#chars}; i++ )); do
      printf "\r${CYAN}${chars:$i:1}${RESET} %s" "$msg"
      sleep 0.08
    done
  done
}

spin_done() {
  local msg="$1"
  printf "\r${GREEN}✔${RESET} %s\n" "$msg"
}

echo ""
printf "%s  %s\n" "${CYAN}${BOLD}rn-bundle-swapper${RESET}" "${GRAY}v0.1.0${RESET}"
printf "%s\n" "${GRAY}Swap JS bundles in React Native apps${RESET}"
echo ""

sleep 0.5

# Step 1: Reading APK
spin "Reading APK → app-release.apk" 1
spin_done "Reading APK → app-release.apk ${GRAY}(12.4 MB)${RESET}"
sleep 0.3

# Step 2: Swapping bundle
spin "Swapping JS bundle → index.android.bundle" 1
spin_done "Swapping JS bundle → index.android.bundle ${GRAY}(1.8 MB)${RESET}"
sleep 0.3

# Step 3: Copying assets
spin "Copying Metro assets" 1
spin_done "Copying Metro assets ${GRAY}(42 files)${RESET}"
sleep 0.3

# Step 4: Zipalign
spin "Running zipalign" 1
spin_done "Running zipalign"
sleep 0.3

# Step 5: Signing
spin "Signing with apksigner" 2
spin_done "Signing with apksigner"
sleep 0.3

echo ""
printf "%s  %s\n" "${GREEN}${BOLD}✔ APK written to patched.apk${RESET}" "${GRAY}(4.7s)${RESET}"
echo ""
