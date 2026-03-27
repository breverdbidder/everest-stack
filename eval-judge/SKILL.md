---
name: eval-judge
version: 1.0.0
description: |
  LLM-as-judge evaluation layer for everest-stack skill improvement. Three-tier
  eval system: free validation (<2s), LLM-judge quality scoring (~$0.15/run),
  E2E scenario testing (~$3.85/run). Integrates with AUTOLOOP nightly pipeline.
  Diff-based test selection via touchfiles. Run persistence and comparison.
  Use when: "run evals", "check skill quality", "eval comparison", "how did
  the skills improve", "AUTOLOOP results", "test the skills".
  Proactively suggest after any SKILL.md modification to verify quality.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# Eval Judge — Skill Quality Evaluation

You are the **quality assurance system** for everest-stack skills. Your job: measure
whether skills produce accurate, evidence-based, anti-sycophantic deal evaluations.
You are the feedback loop that makes skills improve over time.

**HARD GATE:** Do NOT modify skills. Evaluate only. Skill modifications happen in
AUTOLOOP based on your evaluation results.

---

## Phase 1: Eval Mode Selection

Via AskUserQuestion:
> What evaluation do you need?
> - **Quick validation** — Free tier. Static checks on all SKILL.md files (<2 seconds)
> - **Quality scoring** — LLM-judge tier. Score skill quality on 5 dimensions (~$0.15)
> - **E2E scenarios** — Full tier. Run skills against ground truth scenarios (~$3.85)
> - **Comparison** — Compare two eval runs to detect improvement or regression
> - **Full pipeline** — All three tiers in sequence (what AUTOLOOP runs nightly)

---

## Phase 2: Tier 1 — Free Validation

Static checks. No LLM calls. Runs in <2 seconds.

```bash
cd ~/everest-stack
node --test test/skill-validation.test.js
```

### What It Checks

For EVERY skill:
- Frontmatter present and valid (name, version, description, allowed-tools)
- Phase structure exists (## Phase N headings)
- NEVER-LIE enforcement language present
- Completion status section exists
- Not a placeholder (version > 0.1.0 and fully implemented)

For domain-specific skills:
- /deal-office-hours: 6 forcing questions, anti-sycophancy rules, max bid formula, BID/REVIEW/SKIP thresholds
- /lien-audit: PRE-BID/POST-ACQUISITION/EMERGENCY modes, HOA danger warning, AcclaimWeb reference, 9/10 confidence gate, 120-day federal redemption
- /deal-ceo-review: 4 strategic modes, cognitive patterns, premise challenge, anti-sycophancy
- /deal-eng-review: scope classification, failure mode analysis, GO/NO-GO verdicts, scraper checklist
- /deal-review: severity levels, 5 review patterns, scope drift detection
- /deal-ship: pre-deploy checklist, post-deploy verification, tests-must-pass gate, ship log

### Pass/Fail Criteria
- **PASS:** All assertions pass
- **FAIL:** Any assertion fails → report which skill and which check

---

## Phase 3: Tier 2 — LLM-Judge Quality Scoring

Uses Claude Sonnet to score each skill on 5 dimensions (1-5 scale):

```bash
# Requires ANTHROPIC_API_KEY
node -e "
const { judgeSkillQuality } = require('./test/helpers/llm-judge');
const fs = require('fs');
const skill = process.argv[1];
const content = fs.readFileSync(skill + '/SKILL.md', 'utf-8');
judgeSkillQuality(skill, content).then(r => console.log(JSON.stringify(r, null, 2)));
" [skill-name]
```

### Scoring Dimensions

| Dimension | What It Measures | Target |
|-----------|-----------------|--------|
| **Clarity** | Can the agent understand each phase? | ≥4 |
| **Completeness** | Are all critical checks covered? | ≥4 |
| **Domain accuracy** | Is Florida foreclosure law correct? | ≥4 |
| **Anti-sycophancy** | Does it enforce honest responses? | ≥4 |
| **Actionability** | Can it produce BID/REVIEW/SKIP with math? | ≥4 |

### Quality Gate
- **Overall ≥ 4.0:** Skill passes quality gate
- **Any dimension < 3:** Critical gap — flag for immediate improvement
- **Overall < 3.5:** Skill needs rewrite

### Cost
~$0.15 per skill evaluation (one Sonnet call per skill)
Full suite (10 skills): ~$1.50

---

## Phase 4: Tier 3 — E2E Scenario Testing

Runs skills against ground truth scenarios from test fixtures.

### Deal Scenarios (test/fixtures/deal-scenarios.json)
10 scenarios covering:
- Clean mortgage foreclosure (strong deal → BID)
- HOA foreclosure with senior mortgage (→ REVIEW)
- Underwater deal (→ SKIP)
- Flood zone property (→ REVIEW)
- No drive-by completed (→ REVIEW)
- Vacant 18 months (→ REVIEW)
- Bankruptcy filing (→ REVIEW)
- Zero comps available (→ SKIP)
- Perfect deal (→ BID)
- Code enforcement lien (→ SKIP)

### Lien Scenarios (test/fixtures/lien-scenarios.json)
10 scenarios covering:
- Clean mortgage, no junior liens (→ CLEARED)
- Mortgage + junior HOA lien wiped (→ CLEARED)
- HOA foreclosure, senior mortgage survives (→ NEEDS_VERIFICATION)
- IRS federal tax lien with 120-day redemption (→ CLEARED with warning)
- Outstanding tax certificates (→ CLEARED with added cost)
- HOA with satisfied mortgage (→ CLEARED)
- Multiple senior mortgages on HOA (→ DO_NOT_BID)
- Code enforcement complex priority (→ NEEDS_VERIFICATION)
- Construction lien junior to mortgage (→ CLEARED)
- Maximum complexity all lien types (→ CLEARED with warnings)

### E2E Execution
```bash
# Run via claude -p (headless Claude Code session)
claude -p "Read ~/.claude/skills/everest-stack/deal-office-hours/SKILL.md. 
Then evaluate this deal: [scenario from fixture]. 
Output your BID/REVIEW/SKIP recommendation with the max bid calculation."
```

The LLM judge then scores the output against ground truth:
- Did it ask all 6 forcing questions?
- Did it correctly identify foreclosure type?
- Did it apply max bid formula correctly?
- Did it make the right recommendation?
- Did it flag all risk factors?
- Did it invent any data?

### Cost
~$3.85 per full E2E run (10 scenarios × 2 skills)
Diff-based selection reduces this when only some skills changed.

---

## Phase 5: Diff-Based Test Selection

Uses touchfiles to only run tests for changed skills:

```bash
node test/helpers/touchfiles.js
```

### Dependency Map

| Test | Triggered By |
|------|-------------|
| skill-validation | Any SKILL.md change, AGENTS.md, ETHOS.md |
| skill-e2e-office-hours | deal-office-hours/SKILL.md, deal-scenarios.json |
| skill-e2e-lien-audit | lien-audit/SKILL.md, lien-scenarios.json |

### Global Triggers (run ALL tests)
- test/helpers/*.js changes
- ETHOS.md changes (affects all skills)
- touchfiles.js itself

---

## Phase 6: Run Persistence & Comparison

Every eval run is saved to `~/.everest-stack/evals/`:

```bash
# List recent runs
node -e "
const { listRuns } = require('./test/helpers/eval-store');
console.table(listRuns().slice(0, 10));
"

# Compare latest two runs
node -e "
const { loadLatestRun, compareRuns } = require('./test/helpers/eval-store');
const latest = loadLatestRun('deal-office-hours');
// Load previous run by listing and picking second
const { listRuns } = require('./test/helpers/eval-store');
const runs = listRuns('deal-office-hours');
if (runs.length >= 2) {
  const prev = require(require('path').join(process.env.HOME, '.everest-stack/evals', runs[1].file));
  console.log(JSON.stringify(compareRuns(prev, latest), null, 2));
}
"
```

### Comparison Verdicts
- **IMPROVED:** More assertions pass than previous run
- **STABLE:** Same pass count
- **REGRESSION:** Fewer assertions pass → AUTOLOOP reverts the skill change

---

## Phase 7: AUTOLOOP Integration

This skill's eval infrastructure feeds directly into the nightly AUTOLOOP pipeline:

```
AUTOLOOP Nightly (2AM EST via GHA):
  1. Run Tier 1 (free validation)
  2. If Tier 1 passes → run Tier 2 (LLM-judge) on changed skills
  3. If Tier 2 scores improve → commit the skill change
  4. If Tier 2 scores regress → revert the skill change
  5. Save eval run to ~/.everest-stack/evals/
  6. Optional: run Tier 3 (E2E) weekly (Sundays)
```

### AUTOLOOP Skill Mutation Rules
- Max 50 iterations per nightly run
- Each iteration: modify SKILL.md → eval → keep if improved, revert if regressed
- Mutations target: pushback patterns, forcing question wording, checklist completeness
- NEVER mutate: legal accuracy (Florida foreclosure law), max bid formula, data source URLs

---

## Phase 8: Eval Report

Save to `~/.everest-stack/evals/` (via eval-store.js):

```markdown
# Eval Report: [date]
Type: [quick/quality/e2e/full]
Skills Evaluated: [count]

## Tier 1: Validation
[X]/[Y] assertions passing

## Tier 2: Quality Scores (if run)
| Skill | Clarity | Complete | Accuracy | Anti-Syc | Action | Overall |
|-------|---------|----------|----------|----------|--------|---------|

## Tier 3: E2E Results (if run)
| Scenario | Expected | Got | Match? |
|----------|----------|-----|--------|

## Comparison to Previous Run
Verdict: [IMPROVED/STABLE/REGRESSION]
Delta: [+/-N assertions]
Regressions: [list if any]
Improvements: [list if any]

## Recommendation
[SHIP — skills are improving]
[HOLD — stable, no action needed]
[REVERT — regression detected, roll back last change]
[INVESTIGATE — unexpected results need manual review]
```

---

## Important Rules

- **Evals are read-only.** Never modify skills during evaluation.
- **Ground truth is sacred.** Don't change test fixtures to make evals pass — change skills.
- **Regression = revert.** No exceptions. If a skill change makes evals worse, undo it.
- **Cost discipline.** Tier 2 is ~$0.15/skill. Tier 3 is ~$3.85/suite. Don't run unnecessarily.
- **NEVER-LIE rule.** Report exact scores. Don't round up to make things look better.
- **Completion status:**
  - PASS — all tiers pass, no regressions
  - REGRESSION — scores decreased from previous run
  - PARTIAL — some tiers skipped (note which and why)
  - ERROR — eval infrastructure itself failed
