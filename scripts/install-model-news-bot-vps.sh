#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="xycdev-blog-model-news"
RUN_USER="${BLOG_MODEL_NEWS_USER:-$(id -un)}"
RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
CACHE_DIR="${BLOG_MODEL_NEWS_CACHE_DIR:-$RUN_HOME/.cache/xycdev-blog-model-news}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
TIMER_FILE="/etc/systemd/system/${SERVICE_NAME}.timer"

if [[ -z "$RUN_HOME" ]]; then
  echo "Cannot resolve home directory for $RUN_USER" >&2
  exit 1
fi
if ! command -v systemctl >/dev/null; then
  echo "systemd is required" >&2
  exit 1
fi
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo "Node.js and npm are required" >&2
  exit 1
fi
if ! git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Run this installer from the model-news Git checkout" >&2
  exit 1
fi

mkdir -p "$CACHE_DIR"
chmod 700 "$CACHE_DIR"

sudo tee "$SERVICE_FILE" >/dev/null <<EOF
[Unit]
Description=xycdev blog model-release timeline updater
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
User=$RUN_USER
WorkingDirectory=$ROOT
Environment=HOME=$RUN_HOME
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=BLOG_MODEL_NEWS_CACHE_DIR=$CACHE_DIR
ExecStart=/bin/bash $ROOT/scripts/model-news-bot-run.sh
Nice=10
IOSchedulingClass=best-effort
IOSchedulingPriority=6

[Install]
WantedBy=multi-user.target
EOF

sudo tee "$TIMER_FILE" >/dev/null <<EOF
[Unit]
Description=Run xycdev blog model-release updater hourly

[Timer]
OnBootSec=2min
OnUnitActiveSec=1h
Persistent=true
AccuracySec=1min
Unit=${SERVICE_NAME}.service

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now "${SERVICE_NAME}.timer"

echo "Installed ${SERVICE_NAME}.service and ${SERVICE_NAME}.timer"
echo "Checkout: $ROOT"
echo "Cache: $CACHE_DIR"
echo "Schedule: hourly, persistent across reboots"
