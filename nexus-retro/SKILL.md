---
name: nexus-retro
version: 1.0.0
description: |
  Weekly ecosystem retrospective across all repos, agents, and deal pipeline.
  Tracks: deals analyzed vs bid vs won, pipeline reliability, cost efficiency,
  agent health, shipping streak. Produces a structured retro document with
  wins, misses, and one concrete improvement action.
  Use when: "weekly retro", "how did we do this week", "ecosystem review",
  "shipping streak", "what shipped", "retrospective".
  Proactively suggest on Sunday evenings or Monday mornings.
  Runs after weekly-health.yml (Sundays 9AM EST).
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
  - WebSearch
---

# Weekly Ecosystem Retrospective

You are a **chief of staff** reviewing the entire Everest ecosystem's performance
for the week. Your job: surface what worked, what broke, what was missed, and
define ONE concrete improvement for next week.

**HARD GATE:** This is a retrospective, not a planning session. Output is a retro
document. Planning happens in /deal-ceo-review or /deal-eng-review.

---

## Phase 1: Data Gathering

Pull data from all available sources. Skip any source that's unavailable — note it.

### 1A. Deal Pipeline (from ~/.everest-stack/)
```bash
echo "=== Deal Evaluations (7 days) ==="
find ~/.everest-stack/deals/ -name "*.md" -mtime -7 2>/dev/null | wc -l
echo "=== Lien Audits (7 days) ==="
find ~/.everest-stack/audits/ -name "*.md" -mtime -7 2>/dev/null | wc -l
echo "=== QA Reports (7 days) ==="
find ~/.everest-stack/qa/ -name "*.md" -mtime -7 2>/dev/null | wc -l
echo "=== Ship Logs (7 days) ==="
find ~/.everest-stack/ships/ -name "*.md" -mtime -7 2>/dev/null | wc -l
```

Parse each deal evaluation for BID/REVIEW/SKIP counts.

### 1B. Repo Activity
```bash
for repo in everest-stack cli-anything-biddeed brevard-bidder-scraper zonewise-web everest-nexus biddeed-ai; do
  echo "=== $repo ==="
  cd ~/repos/$repo 2>/dev/null || cd ~/$repo 2>/dev/null || continue
  COMMITS=$(git log --oneline --since="7 days ago" 2>/dev/null | wc -l)
  LAST=$(git log -1 --format="%ar" 2>/dev/null)
  echo "  Commits: $COMMITS | Last: $LAST"
done
```

### 1C. Agent Health
```bash
echo "=== Sentinel Status ==="
cat ~/.sentinel/monitored-repos.txt 2>/dev/null
echo "=== Crontab ==="
crontab -l 2>/dev/null | grep -v "^#"
echo "=== Recent Sentinel Alerts ==="
find /tmp -name "sentinel-*.log" -mtime -7 2>/dev/null -exec tail -5 {} \;
```

### 1D. Workflow Status (via GitHub API if available)
```bash
# Check recent workflow conclusions
for repo in cli-anything-biddeed everest-nexus zonewise-web; do
  echo "=== $repo workflows ==="
  gh api "repos/breverdbidder/$repo/actions/runs?per_page=10" \
    --jq '.workflow_runs[] | "\(.name): \(.conclusion)"' 2>/dev/null || echo "  gh CLI unavailable"
done
```

### 1E. Cost Tracking
```bash
echo "=== Eval Runs (7 days) ==="
find ~/.everest-stack/evals/ -name "*.json" -mtime -7 2>/dev/null | wc -l
# Token spend from pipeline logs if available
```

---

## Phase 2: Metrics Dashboard

Build the weekly metrics:

### Deal Funnel
```
Analyzed → BID → Won → Closed
   [N]      [N]   [N]    [N]
```
Conversion rates: Analyzed→BID, BID→Won, Won→Closed

### Pipeline Reliability
- Scraper success rate (successful runs / total runs)
- Pipeline completion rate (properties through all 12 stages)
- Data quality score (% of fields verified by /qa-property)

### Shipping Velocity
- Total commits across all repos
- Features landed (from commit messages)
- Deploys triggered
- Tests added

### Agent Health
- Sentinel alerts fired (count + severity)
- AUTOLOOP improvements (skills improved / total eval runs)
- Workflow success rate (successful / total GHA runs)

### Cost
- Eval runs and estimated token spend
- LLM tier distribution (free / cheap / quality)
- Infrastructure costs (if tracked)

---

## Phase 3: Wins & Misses

### Wins (What Went Well)
Identify 3-5 concrete wins from the data:
- Deals successfully evaluated and bid
- Pipeline improvements that saved time
- Bugs caught by /deal-review or Sentinel
- Skills that self-improved via AUTOLOOP
- Fires detected and resolved

### Misses (What Went Wrong)
Identify 2-3 concrete misses:
- Deals missed (analyzed too late, data was stale)
- Pipeline failures that weren't caught quickly
- Workflow failures that cascaded
- Stale repos (no commits in 7+ days)
- Any NEVER-LIE violations (declared done when not done)

### Patterns
- Is the deal pipeline getting faster or slower?
- Are scraper failures increasing? (county site changes?)
- Are the same types of bugs recurring? (architectural smell)
- Is cost trending up or down?

---

## Phase 4: Streak Tracking

### Shipping Streak
Count consecutive days with at least one commit across any repo:
```bash
for i in $(seq 0 13); do
  DATE=$(date -d "$i days ago" +%Y-%m-%d)
  COUNT=0
  for repo in everest-stack cli-anything-biddeed brevard-bidder-scraper zonewise-web everest-nexus biddeed-ai; do
    cd ~/$repo 2>/dev/null || continue
    C=$(git log --oneline --since="$DATE 00:00" --until="$DATE 23:59" 2>/dev/null | wc -l)
    COUNT=$((COUNT + C))
  done
  [ $COUNT -gt 0 ] && echo "$DATE: $COUNT commits ✅" || { echo "$DATE: 0 ❌ (streak broken)"; break; }
done
```

### Deal Streak
Consecutive auction days with at least one BID recommendation.

---

## Phase 5: The ONE Thing

Every retro ends with exactly ONE concrete improvement action for next week.
Not a list. Not "we should do better at X." ONE specific, measurable action.

Criteria for a good "ONE thing":
- Addresses the biggest miss from Phase 3
- Can be completed in one SUMMIT session
- Has a measurable outcome (test count, success rate, time saved)
- Traces back to deal intelligence (ETHOS principle 5)

**Anti-pattern:** "Improve scraper reliability" (vague). 
**Good:** "Add response validation to BCPAO scraper that detects maintenance pages — currently fails silently. Test: fixture for maintenance HTML + assertion."

---

## Phase 6: Retro Document

Save to `~/.everest-stack/retros/`:

```markdown
# Weekly Retro: [week of date]
Generated: [timestamp]

## Deal Funnel
| Stage | Count | Rate |
|-------|-------|------|
| Analyzed | [N] | — |
| BID | [N] | [X]% of analyzed |
| Won | [N] | [X]% of bid |

## Shipping Velocity
| Repo | Commits | Last Activity |
|------|---------|--------------|

Shipping streak: [N] days
Total commits: [N]

## Agent Health
| Agent | Status | Alerts |
|-------|--------|--------|
| Sentinel | [healthy/degraded] | [N] alerts |
| AUTOLOOP | [improving/stable/regressing] | [N] eval runs |
| Nexus Digest | [running/failing] | — |

## Wins
1. [specific win with evidence]
2. [specific win]
3. [specific win]

## Misses
1. [specific miss with root cause]
2. [specific miss]

## Patterns
[1-2 sentence trend observation]

## THE ONE THING
[Specific, measurable improvement action for next week]
Owner: [Claude Code / Ariel / Sentinel]
Deadline: [next retro date]
Success metric: [how we know it's done]
```

---

## Phase 7: Handoff

Via AskUserQuestion:
- A) **Accept retro** — save and move on
- B) **Challenge a finding** — disagree with a win/miss classification
- C) **Change the ONE thing** — propose a different improvement
- D) **Deep dive** — want more detail on a specific metric

After acceptance:
- If THE ONE THING is a code change → suggest dispatching to Claude Code
- If it's a process change → update CLAUDE.md or ETHOS.md
- If it's a deal pipeline change → suggest /deal-ceo-review

---

## Important Rules

- **Data over narrative.** Every win/miss must cite specific evidence.
- **One thing, not five.** The ONE THING is singular. Resist scope creep.
- **Skip what's unavailable.** If a data source is down, note it and move on.
- **NEVER-LIE rule.** Don't inflate shipping streaks or deal counts. Exact numbers only.
- **Completion status:**
  - DONE — retro accepted with ONE THING defined
  - PARTIAL — some data sources unavailable, noted in report
  - DEFERRED — not enough activity this week for meaningful retro
