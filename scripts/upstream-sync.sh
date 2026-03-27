#!/bin/bash
# EVEREST-STACK: Weekly upstream sync from garrytan/gstack
# Called by weekly-health.yml every Sunday 9AM EST
# Cherry-picks eval infra + browse + security updates only

set -euo pipefail

REPO_DIR="$HOME/everest-stack"
LOG_FILE="/tmp/everest-stack-upstream-$(date +%Y%m%d).log"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

cd "$REPO_DIR" || { echo "Repo not found at $REPO_DIR"; exit 1; }

# Ensure upstream remote exists
if ! git remote get-url upstream > /dev/null 2>&1; then
  git remote add upstream https://github.com/garrytan/gstack.git
  log "Added upstream remote"
fi

# Fetch latest upstream
git fetch upstream main --depth=50 2>&1 | tee -a "$LOG_FILE"
UPSTREAM_SHA=$(git rev-parse --short upstream/main)
LOCAL_SHA=$(git rev-parse --short HEAD)
log "Local: $LOCAL_SHA | Upstream: $UPSTREAM_SHA"

# Get commits from last 7 days
RECENT_COMMITS=$(git log upstream/main --oneline --since='7 days ago' 2>/dev/null || echo "none")
COMMIT_COUNT=$(echo "$RECENT_COMMITS" | grep -c "." 2>/dev/null || echo "0")

if [ "$COMMIT_COUNT" -eq 0 ] || [ "$RECENT_COMMITS" = "none" ]; then
  log "No upstream changes in last 7 days"
  echo "UPSTREAM_STATUS=no_changes" >> "$LOG_FILE"
  exit 0
fi

log "=== $COMMIT_COUNT upstream commits in last 7 days ==="
echo "$RECENT_COMMITS" | tee -a "$LOG_FILE"

# Identify cherry-pick candidates
# TARGETS: test/, cso/ security methodology, ETHOS.md philosophy
# SKIP: office-hours/, plan-ceo-review/, telemetry, YC branding
CANDIDATES=""
while IFS= read -r line; do
  SHA=$(echo "$line" | awk '{print $1}')
  MSG=$(echo "$line" | cut -d' ' -f2-)

  # Check if commit touches our target paths
  FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r "$SHA" 2>/dev/null || echo "")

  DOMINATED_BY_TARGETS=false
  for f in $FILES_CHANGED; do
    case "$f" in
      test/helpers/*|test/fixtures/*) DOMINATED_BY_TARGETS=true ;;
      browse/src/*|browse/dist/*) DOMINATED_BY_TARGETS=true ;;
      cso/*) DOMINATED_BY_TARGETS=true ;;
      ETHOS.md) DOMINATED_BY_TARGETS=true ;;
    esac
  done

  # Skip if it touches our rewritten skills
  SKIP=false
  for f in $FILES_CHANGED; do
    case "$f" in
      office-hours/*|plan-ceo-review/*|plan-eng-review/*) SKIP=true ;;
      *telemetry*|*analytics*|*gstack-upgrade*) SKIP=true ;;
    esac
  done

  if [ "$DOMINATED_BY_TARGETS" = true ] && [ "$SKIP" = false ]; then
    CANDIDATES="$CANDIDATES $SHA"
    log "  ✅ CANDIDATE: $SHA $MSG"
  else
    log "  ⏭️  SKIP: $SHA $MSG"
  fi
done <<< "$RECENT_COMMITS"

# Report candidates (do NOT auto-cherry-pick — surface for review)
CANDIDATE_COUNT=$(echo "$CANDIDATES" | wc -w | tr -d ' ')
log "=== $CANDIDATE_COUNT cherry-pick candidates ==="

if [ "$CANDIDATE_COUNT" -gt 0 ]; then
  echo "UPSTREAM_STATUS=candidates_found" >> "$LOG_FILE"
  echo "UPSTREAM_CANDIDATES=$CANDIDATES" >> "$LOG_FILE"
  log "Candidates ready for manual cherry-pick: $CANDIDATES"
else
  echo "UPSTREAM_STATUS=nothing_relevant" >> "$LOG_FILE"
  log "No relevant upstream changes to cherry-pick"
fi

# Output summary for weekly-health digest
cat << EOF

EVEREST-STACK UPSTREAM SYNC REPORT
===================================
Local SHA:     $LOCAL_SHA
Upstream SHA:  $UPSTREAM_SHA
Commits (7d):  $COMMIT_COUNT
Candidates:    $CANDIDATE_COUNT
Status:        $([ "$CANDIDATE_COUNT" -gt 0 ] && echo "REVIEW_NEEDED" || echo "CLEAN")
EOF
