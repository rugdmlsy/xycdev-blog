#!/bin/bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

SOURCE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE_DIR="${BLOG_MODEL_NEWS_CACHE_DIR:-$HOME/Library/Caches/xycdev-blog-model-news}"
WORKTREE="${BLOG_MODEL_NEWS_WORKTREE:-$CACHE_DIR/worktree}"
PLIST="$HOME/Library/LaunchAgents/com.xycdev.blog-model-release-news.plist"
LABEL="com.xycdev.blog-model-release-news"
LOG_OUT="$CACHE_DIR/launchd.out.log"
LOG_ERR="$CACHE_DIR/launchd.err.log"

mkdir -p "$CACHE_DIR" "$HOME/Library/LaunchAgents"

git -C "$SOURCE_ROOT" fetch origin main
if [[ -d "$WORKTREE/.git" || -f "$WORKTREE/.git" ]]; then
  git -C "$WORKTREE" fetch origin main
  git -C "$WORKTREE" reset --hard origin/main
else
  if [[ -e "$WORKTREE" ]]; then
    echo "Refusing to replace non-worktree path: $WORKTREE" >&2
    exit 1
  fi
  git -C "$SOURCE_ROOT" worktree prune
  git -C "$SOURCE_ROOT" worktree add --detach "$WORKTREE" origin/main
fi

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$WORKTREE/scripts/model-news-bot-run.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$WORKTREE</string>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>3600</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>LowPriorityIO</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_OUT</string>
  <key>StandardErrorPath</key>
  <string>$LOG_ERR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>BLOG_MODEL_NEWS_CACHE_DIR</key>
    <string>$CACHE_DIR</string>
  </dict>
</dict>
</plist>
PLIST

plutil -lint "$PLIST"
launchctl bootout "gui/$UID/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$PLIST"
launchctl enable "gui/$UID/$LABEL"
launchctl kickstart -k "gui/$UID/$LABEL"

echo "Installed $LABEL"
echo "Worktree: $WORKTREE"
echo "Schedule: hourly + RunAtLoad"
echo "Logs: $LOG_OUT / $LOG_ERR"
