#!/bin/bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE_DIR="${BLOG_MODEL_NEWS_CACHE_DIR:-$HOME/Library/Caches/xycdev-blog-model-news}"
STATE_PATH="$CACHE_DIR/state.json"
LOCK_DIR="$CACHE_DIR/run.lock"
PENDING_DEPLOY="$CACHE_DIR/pending-deploy"
mkdir -p "$CACHE_DIR"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "[model-news-bot] another run is active; exiting"
  exit 0
fi
STATE_PENDING=0

cd "$ROOT"

restore_state() {
  if [[ -f "$CACHE_DIR/state.before-run.json" ]]; then
    mv -f "$CACHE_DIR/state.before-run.json" "$STATE_PATH"
  elif [[ -f "$CACHE_DIR/state.was-missing" ]]; then
    rm -f "$STATE_PATH" "$CACHE_DIR/state.was-missing"
  fi
  rm -f "$CACHE_DIR/state.was-missing"
  STATE_PENDING=0
}

backup_state() {
  rm -f "$CACHE_DIR/state.before-run.json" "$CACHE_DIR/state.was-missing"
  if [[ -f "$STATE_PATH" ]]; then
    cp "$STATE_PATH" "$CACHE_DIR/state.before-run.json"
  else
    : > "$CACHE_DIR/state.was-missing"
  fi
  STATE_PENDING=1
}

accept_state() {
  rm -f "$CACHE_DIR/state.before-run.json" "$CACHE_DIR/state.was-missing"
  STATE_PENDING=0
}

cleanup() {
  code=$?
  set +e
  if [[ "$code" -ne 0 && "$STATE_PENDING" -eq 1 ]]; then restore_state; fi
  rm -rf "$LOCK_DIR"
  exit "$code"
}
trap cleanup EXIT

deploy_current_main() {
  echo "[model-news-bot] preparing Cloudflare Pages deployment from live-site overlay"
  npm run prepare:model-news-deploy
  npx --yes --prefer-offline wrangler@4.123.0 pages deploy .pages-dist --project-name xycdev-journal
  rm -f "$PENDING_DEPLOY"
}

git fetch origin main
# This script is only installed in its dedicated bot worktree. Keep that tree
# exactly aligned with remote main before every run so it can never capture a
# user's unrelated local drafts or editor changes.
git reset --hard origin/main
rm -rf .pages-dist

if [[ -f "$PENDING_DEPLOY" ]]; then
  echo "[model-news-bot] retrying a previously committed deployment"
  npm run timeline:build
  npm run check
  deploy_current_main
fi

for attempt in 1 2 3; do
  git fetch origin main
  git reset --hard origin/main
  start_sha="$(git rev-parse origin/main)"
  backup_state

  MODEL_NEWS_STATE_PATH="$STATE_PATH" npm run news:models

  if git diff --quiet -- content/timeline.json; then
    accept_state
    echo "[model-news-bot] no new model release"
    exit 0
  fi

  # Only the timeline source is allowed to change here. Regenerate the combined
  # timeline and run the repository's normal validation before committing.
  npm run timeline:build
  npm run check

  git fetch origin main
  latest_sha="$(git rev-parse origin/main)"
  if [[ "$latest_sha" != "$start_sha" ]]; then
    echo "[model-news-bot] main changed during scan; retrying against latest main"
    restore_state
    git reset --hard origin/main
    continue
  fi

  changed="$(git status --short --untracked-files=no | awk '{print $2}' | sort -u)"
  unexpected="$(printf '%s\n' "$changed" | grep -Ev '^(content/timeline\.json|timeline\.html)$' || true)"
  if [[ -n "$unexpected" ]]; then
    restore_state
    echo "[model-news-bot] refusing to commit unexpected files:" >&2
    printf '%s\n' "$unexpected" >&2
    exit 1
  fi

  git add -- content/timeline.json timeline.html
  git commit -m "Auto-record new model release"

  if git push origin HEAD:main; then
    accept_state
    git rev-parse HEAD > "$PENDING_DEPLOY"
    deploy_current_main
    echo "[model-news-bot] timeline committed, pushed, and deployed"
    exit 0
  fi

  echo "[model-news-bot] push raced with another main update; retrying"
  restore_state
  git fetch origin main
  git reset --hard origin/main
done

echo "[model-news-bot] failed after 3 main-branch races" >&2
exit 1
