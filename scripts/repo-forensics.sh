#!/bin/bash
# EVEREST-STACK: Repo forensics health check
# Called by weekly-health.yml alongside other repos
# Reports: test status, skill count, upstream sync, eval runs

set -euo pipefail

REPO_DIR="$HOME/everest-stack"

if [ ! -d "$REPO_DIR" ]; then
  echo "EVEREST_STACK_STATUS=not_deployed"
  exit 0
fi

cd "$REPO_DIR"

# Git status
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LAST_COMMIT=$(git log -1 --format="%ar" 2>/dev/null || echo "unknown")
DAYS_SINCE=$(git log -1 --format="%ct" 2>/dev/null | xargs -I{} bash -c 'echo $(( ($(date +%s) - {}) / 86400 ))' 2>/dev/null || echo "?")

# Upstream status
UPSTREAM_SHA="n/a"
if git remote get-url upstream > /dev/null 2>&1; then
  git fetch upstream main --depth=1 -q 2>/dev/null || true
  UPSTREAM_SHA=$(git rev-parse --short upstream/main 2>/dev/null || echo "fetch_failed")
fi

# Test status
TEST_RESULT="unknown"
if command -v node > /dev/null 2>&1; then
  if node --test test/skill-validation.test.js > /dev/null 2>&1; then
    PASS=$(node --test test/skill-validation.test.js 2>&1 | grep "# pass" | awk '{print $3}')
    TEST_RESULT="${PASS}/26 pass"
  else
    TEST_RESULT="FAILING"
  fi
fi

# Skill count
FULL_SKILLS=$(find . -maxdepth 2 -name "SKILL.md" -not -path "./SKILL.md" -exec grep -L "STUB" {} \; | wc -l)
STUB_SKILLS=$(find . -maxdepth 2 -name "SKILL.md" -not -path "./SKILL.md" -exec grep -l "STUB" {} \; | wc -l)
TOTAL_SKILLS=$((FULL_SKILLS + STUB_SKILLS))

# Eval runs
EVAL_COUNT=0
EVAL_DIR="$HOME/.everest-stack/evals"
if [ -d "$EVAL_DIR" ]; then
  EVAL_COUNT=$(ls "$EVAL_DIR"/*.json 2>/dev/null | wc -l)
fi

# Staleness check
STALE="NO"
if [ "$DAYS_SINCE" != "?" ] && [ "$DAYS_SINCE" -gt 7 ]; then
  STALE="YES ($DAYS_SINCE days)"
fi

# Output
cat << EOF
EVEREST-STACK HEALTH
====================
Branch:       $BRANCH
SHA:          $SHA
Last commit:  $LAST_COMMIT
Stale:        $STALE
Tests:        $TEST_RESULT
Skills:       $TOTAL_SKILLS ($FULL_SKILLS full, $STUB_SKILLS stubs)
Eval runs:    $EVAL_COUNT
Upstream:     $UPSTREAM_SHA
EOF

# Machine-readable output for digest aggregation
echo "EVEREST_STACK_STATUS=deployed"
echo "EVEREST_STACK_SHA=$SHA"
echo "EVEREST_STACK_TESTS=$TEST_RESULT"
echo "EVEREST_STACK_SKILLS=${FULL_SKILLS}f/${STUB_SKILLS}s"
echo "EVEREST_STACK_STALE=$STALE"
echo "EVEREST_STACK_UPSTREAM=$UPSTREAM_SHA"
