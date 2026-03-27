---
name: everest-stack
version: 1.0.0
description: |
  Foreclosure deal intelligence plugin for Claude Code. 10 specialist skills
  for auction analysis, lien priority verification, property QA, market intel,
  and pipeline engineering. Built for Brevard County FL foreclosure investing.
  Upstream: garrytan/gstack (architecture + eval infra).
  Domain: Everest Capital USA / BidDeed.AI.
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

# everest-stack

Foreclosure deal intelligence for Claude Code.

## Quick start

```bash
claude plugin install everest-stack
```

Then in Claude Code:

```
/deal-office-hours    # Stress-test a deal before bidding
/lien-audit           # Verify lien priority on auction properties
/deal-ceo-review      # Strategic portfolio review
/market-intel         # Comp analysis and demographics
```

## Philosophy

Read `ETHOS.md` for the five principles that govern every skill:

1. **Exactness Over Velocity** — get the numbers right
2. **Verify Before You Bid** — check multiple sources
3. **Autonomous Until Irreversible** — don't wait for permission
4. **Cost Discipline Is Survival** — $10/session MAX
5. **The Deal Decides** — every task traces to deal intelligence

## Skill catalog

See `AGENTS.md` for the full inventory of 10 skills with origin mapping.
