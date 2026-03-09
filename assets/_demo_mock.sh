#!/usr/bin/env bash
# Mock script used only for recording the demo GIF — not part of the library.

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

spin() {
  local msg="$1"
  local frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
  for i in 0 1 2 3 4 5 6 7 8 9; do
    printf "\r  ${CYAN}${frames[$i]}${RESET} ${msg}"
    sleep 0.08
  done
}

echo ""
echo -e "  ${BOLD}${CYAN}rn-bundle-swapper${RESET}  ${DIM}v0.1.0${RESET}"
echo ""

# Simulate: android command
echo -e "  ${DIM}\$${RESET} rn-bundle-swapper android app-release.apk \\"
sleep 0.3
echo -e "      --jsbundle index.android.bundle \\"
sleep 0.2
echo -e "      --keystore release.keystore --ks-pass ••••••• --ks-alias mykey \\"
sleep 0.2
echo -e "      --copy-assets --output patched.apk"
echo ""

sleep 0.5

# Swap bundle step
printf "  ${CYAN}ℹ${RESET} Replacing bundle: assets/index.android.bundle\n"
sleep 0.4
printf "  ${CYAN}ℹ${RESET} Looking for Android assets...\n"
sleep 0.3
printf "  ${CYAN}ℹ${RESET} Found assets directory: ./assets\n"
sleep 0.4

# Align step
spin "Aligning APK (zipalign)..."
printf "\r  ${GREEN}✔${RESET} APK aligned                        \n"
sleep 0.3

# Sign step
spin "Signing APK..."
printf "\r  ${GREEN}✔${RESET} APK signed                         \n"
sleep 0.3

echo ""
echo -e "  ${GREEN}${BOLD}✔ APK written to patched.apk${RESET}"
echo ""

sleep 0.6

echo -e "  ${DIM}────────────────────────────────────────${RESET}"
echo -e "  ${CYAN}Full native rebuild:${RESET}  ${YELLOW}~8 minutes${RESET}"
echo -e "  ${CYAN}rn-bundle-swapper:${RESET}    ${GREEN}${BOLD}~5 seconds${RESET}"
echo -e "  ${DIM}────────────────────────────────────────${RESET}"
echo ""
