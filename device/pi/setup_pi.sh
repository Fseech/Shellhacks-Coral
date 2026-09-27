#!/usr/bin/env bash
# setup_pi.sh - one-time setup for the ReefWatch Raspberry Pi.
#
# Run on the Pi (over SSH), from anywhere:
#     bash ~/Shellhacks-Coral/device/pi/setup_pi.sh
#
# What it does:
#   1. Installs the packages capture.py needs (camera, serial, database, git).
#   2. Gives your user access to the camera and the Arduino.
#   3. Asks for the Tiger Data link once and stores it privately in ~/reef.env.
#   4. Creates the "reefwatch" service: starts at every boot, pulls the latest
#      code from GitHub first, restarts itself if it ever stops.
# Safe to run again: it only updates what is already there.
set -e

REPO="$HOME/Shellhacks-Coral"
ENV_FILE="$HOME/reef.env"
BRANCH="${BRANCH:-add-pipeline-and-schema}"
CAMERA_FLAG="${CAMERA_FLAG:---usb}"          # --usb for the Logitech C270; set to "" for a ribbon camera
DEMO_FLAGS="${DEMO_FLAGS:---demo-date 2023-08-20}"

echo "== 1/5 Installing packages (a few minutes the first time)"
sudo apt-get update -qq
sudo apt-get install -y -qq git python3-opencv python3-numpy python3-serial python3-psycopg2 fswebcam v4l-utils

echo "== 2/5 Getting the code"
if [ -d "$REPO/.git" ]; then
  git -C "$REPO" fetch -q origin
  git -C "$REPO" checkout -q "$BRANCH"
  git -C "$REPO" pull -q --ff-only || echo "   (could not pull; using the code already here)"
else
  git clone -q -b "$BRANCH" https://github.com/Fseech/Shellhacks-Coral.git "$REPO"
fi
echo "   running code: $(git -C "$REPO" log --oneline -1)"

echo "== 3/5 Camera and Arduino permissions"
sudo usermod -aG video,dialout "$USER"

echo "== 4/5 Tiger Data link"
if [ -s "$ENV_FILE" ] && grep -q '^DATABASE_URL=' "$ENV_FILE"; then
  echo "   already saved in $ENV_FILE (delete that file to enter a new one)"
else
  read -r -s -p "   Paste the DATABASE_URL (postgres://...), then Enter. Nothing will show while you paste: " URL
  echo
  if [ -z "$URL" ]; then echo "   No link entered. Run this script again when you have it."; exit 1; fi
  umask 077
  printf 'DATABASE_URL=%s\n' "$URL" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "   saved to $ENV_FILE (only your user can read it)"
fi

echo "== 5/5 Auto-start service"
sudo tee /etc/systemd/system/reefwatch.service > /dev/null <<EOF
[Unit]
Description=ReefWatch capture (runs the latest code from GitHub)
Wants=network-online.target time-sync.target
After=network-online.target time-sync.target

[Service]
User=$USER
WorkingDirectory=$REPO/device/pi
EnvironmentFile=$ENV_FILE
ExecStartPre=-/usr/bin/timeout 30 /usr/bin/git -C $REPO pull --ff-only
ExecStart=/usr/bin/python3 -u capture.py $CAMERA_FLAG $DEMO_FLAGS
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable -q systemd-time-wait-sync 2>/dev/null || true
sudo systemctl daemon-reload
sudo systemctl enable -q reefwatch
sudo systemctl restart reefwatch

echo
echo "Done. ReefWatch is running and will start on every boot."
echo "  Watch it live:   journalctl -u reefwatch -f      (Ctrl+C to stop watching)"
echo "  Stop it:         sudo systemctl stop reefwatch"
echo "  Get new code:    sudo systemctl restart reefwatch   (or reboot)"
echo "Tip: reboot once now (sudo reboot) so the camera/Arduino permissions apply."
