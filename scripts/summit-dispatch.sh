#!/bin/bash
# SUMMIT DISPATCH: everest-stack full Phase 1 deployment
# Entry point for Hetzner 87.99.129.125
# Executes: deploy → upstream → tests → plugin install → health integration
#
# Usage: ssh claude@87.99.129.125 'bash -s' < scripts/summit-dispatch.sh
# Or via SUMMIT GHA: dispatches this script automatically

set -euo pipefail

echo "============================================"
echo " EVEREST-STACK SUMMIT DISPATCH"
echo " $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "============================================"

REPO_URL="https://github.com/breverdbidder/everest-stack.git"
REPO_DIR="$HOME/everest-stack"
HEALTH_REPOS_FILE="$HOME/.sentinel/monitored-repos.txt"

# ============================================================
# 1. CLONE / UPDATE REPO
# ============================================================
echo ""
echo "[1/7] Repo setup..."
if [ -d "$REPO_DIR/.git" ]; then
  cd "$REPO_DIR"
  git fetch origin main -q 2>/dev/null
  git reset --hard origin/main -q
  echo "  ✅ Repo updated to $(git rev-parse --short HEAD)"
else
  git clone "$REPO_URL" "$REPO_DIR" -q
  cd "$REPO_DIR"
  echo "  ✅ Repo cloned: $(git rev-parse --short HEAD)"
fi

git config user.email "ariel@everestcapitalusa.com"
git config user.name "Ariel Shapira"

# ============================================================
# 2. ADD UPSTREAM REMOTE
# ============================================================
echo ""
echo "[2/7] Upstream remote (garrytan/gstack)..."
if git remote get-url upstream > /dev/null 2>&1; then
  echo "  ✅ Already configured: $(git remote get-url upstream)"
else
  git remote add upstream https://github.com/garrytan/gstack.git
  echo "  ✅ Added: https://github.com/garrytan/gstack.git"
fi

git fetch upstream main --depth=1 -q 2>/dev/null || echo "  ⚠️ Upstream fetch failed (non-blocking)"
UPSTREAM_SHA=$(git rev-parse --short upstream/main 2>/dev/null || echo "n/a")
echo "  Upstream HEAD: $UPSTREAM_SHA"

# ============================================================
# 3. INSTALL AS CLAUDE CODE PLUGIN
# ============================================================
echo ""
echo "[3/7] Claude Code plugin install..."

SKILLS_DIR="$HOME/.claude/skills"
mkdir -p "$SKILLS_DIR"

# Symlink install
PLUGIN_LINK="$SKILLS_DIR/everest-stack"
if [ -L "$PLUGIN_LINK" ]; then
  rm "$PLUGIN_LINK"
fi
ln -sf "$REPO_DIR" "$PLUGIN_LINK"

# Verify
if [ -f "$PLUGIN_LINK/SKILL.md" ]; then
  echo "  ✅ Symlinked: $PLUGIN_LINK → $REPO_DIR"
else
  echo "  ❌ FAILED: SKILL.md not accessible"
  exit 1
fi

# Try native install if CLI available
if command -v claude > /dev/null 2>&1; then
  echo "  Attempting native: claude plugin install..."
  claude plugin install "$REPO_DIR" 2>/dev/null && echo "  ✅ Native install succeeded" || echo "  ⚠️ Native install failed — symlink active"
fi

# ============================================================
# 4. RUN VALIDATION TESTS
# ============================================================
echo ""
echo "[4/7] Validation tests (26 assertions)..."

if ! command -v node > /dev/null 2>&1; then
  echo "  ❌ Node.js not found"
  exit 1
fi

cd "$REPO_DIR"
TEST_OUTPUT=$(node --test test/skill-validation.test.js 2>&1)
TEST_EXIT=$?

PASS=$(echo "$TEST_OUTPUT" | grep "# pass" | awk '{print $3}')
FAIL=$(echo "$TEST_OUTPUT" | grep "# fail" | awk '{print $3}')

if [ "$TEST_EXIT" -eq 0 ]; then
  echo "  ✅ $PASS/$PASS passing, 0 failed"
else
  echo "  ❌ $PASS pass, $FAIL fail"
  echo "$TEST_OUTPUT" | grep "not ok"
  exit 1
fi

# ============================================================
# 5. VERIFY SKILL CONTENT
# ============================================================
echo ""
echo "[5/7] Skill content verification..."

DOH_LINES=$(wc -l < deal-office-hours/SKILL.md)
LA_LINES=$(wc -l < lien-audit/SKILL.md)
FULL_SKILLS=$(find . -maxdepth 2 -name "SKILL.md" -not -path "./SKILL.md" -exec grep -L "STUB" {} \; 2>/dev/null | wc -l)
STUB_SKILLS=$(find . -maxdepth 2 -name "SKILL.md" -not -path "./SKILL.md" -exec grep -l "STUB" {} \; 2>/dev/null | wc -l)

echo "  deal-office-hours: ${DOH_LINES} lines ✅"
echo "  lien-audit: ${LA_LINES} lines ✅"
echo "  Full skills: $FULL_SKILLS | Stubs: $STUB_SKILLS | Total: $((FULL_SKILLS + STUB_SKILLS))"

# ============================================================
# 6. REGISTER WITH WEEKLY-HEALTH (SENTINEL)
# ============================================================
echo ""
echo "[6/7] Weekly-health integration..."

# Add to monitored repos if sentinel config exists
if [ -f "$HEALTH_REPOS_FILE" ]; then
  if ! grep -q "everest-stack" "$HEALTH_REPOS_FILE" 2>/dev/null; then
    echo "everest-stack:$REPO_DIR" >> "$HEALTH_REPOS_FILE"
    echo "  ✅ Added to monitored repos"
  else
    echo "  ✅ Already in monitored repos"
  fi
else
  echo "  ⚠️ Sentinel monitored-repos.txt not found — creating"
  mkdir -p "$HOME/.sentinel"
  echo "everest-stack:$REPO_DIR" > "$HEALTH_REPOS_FILE"
  echo "  ✅ Created monitored repos with everest-stack"
fi

# Make scripts executable
chmod +x "$REPO_DIR/scripts/"*.sh 2>/dev/null || true

# Wire upstream sync into cron if not already present
CRON_LINE="0 14 * * 0 $REPO_DIR/scripts/upstream-sync.sh >> /tmp/everest-upstream.log 2>&1"
if ! crontab -l 2>/dev/null | grep -q "upstream-sync.sh"; then
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "  ✅ Upstream sync cron added: Sundays 9AM EST (14:00 UTC)"
else
  echo "  ✅ Upstream sync cron already configured"
fi

# Wire repo-forensics into Sunday health check
FORENSICS_LINE="5 14 * * 0 $REPO_DIR/scripts/repo-forensics.sh >> /tmp/everest-health.log 2>&1"
if ! crontab -l 2>/dev/null | grep -q "repo-forensics.sh"; then
  (crontab -l 2>/dev/null; echo "$FORENSICS_LINE") | crontab -
  echo "  ✅ Repo forensics cron added: Sundays 9:05AM EST"
else
  echo "  ✅ Repo forensics cron already configured"
fi

# ============================================================
# 7. DEPLOYMENT SUMMARY
# ============================================================
echo ""
echo "============================================"
echo " DEPLOYMENT COMPLETE"
echo "============================================"
echo ""
echo " Repo:       $REPO_DIR"
echo " SHA:        $(git rev-parse --short HEAD)"
echo " Plugin:     $PLUGIN_LINK"
echo " Upstream:   garrytan/gstack ($UPSTREAM_SHA)"
echo " Tests:      $PASS/$PASS passing"
echo " Skills:     $FULL_SKILLS full + $STUB_SKILLS stubs"
echo " Cron:       upstream-sync.sh (Sun 9AM EST)"
echo "             repo-forensics.sh (Sun 9:05AM EST)"
echo ""
echo " AVAILABLE COMMANDS IN CLAUDE CODE:"
echo "   /deal-office-hours  — 6 forcing questions for RE deals"
echo "   /lien-audit         — Lien priority security audit"
echo ""
echo " NEXT: Phase 2 (deal-ceo-review, deal-eng-review,"
echo "       deal-review, deal-ship) via SUMMIT dispatch"
echo "============================================"

# Send Telegram notification
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  MSG="🏔️ *everest-stack DEPLOYED*
• SHA: $(git rev-parse --short HEAD)
• Tests: ${PASS}/${PASS} ✅
• Skills: ${FULL_SKILLS} full + ${STUB_SKILLS} stubs
• Plugin: ~/.claude/skills/everest-stack
• Upstream: gstack $UPSTREAM_SHA
• Cron: Sun 9AM upstream + forensics
• Ready: /deal-office-hours + /lien-audit"

  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" \
    -d text="$MSG" \
    -d parse_mode="Markdown" > /dev/null 2>&1 || true
fi
