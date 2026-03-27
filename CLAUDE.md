# everest-stack development

## Overview
Claude Code plugin for foreclosure deal intelligence. Powered by GStack architecture, rewritten for Brevard County real estate investing.

## Commands
```bash
npm install           # install dependencies
npm test              # run free tests (skill validation, <2s)
npm run test:evals    # run paid evals: LLM judge + E2E (diff-based, ~$4/run max)
npm run test:evals:all # run ALL paid evals regardless of diff
npm run eval:select   # show which tests would run based on current diff
npm run eval:compare  # compare two eval runs
npm run eval:summary  # aggregate stats across all eval runs
```

## Project structure
```
everest-stack/
├── CLAUDE.md                    # This file
├── ETHOS.md                     # Everest builder philosophy
├── AGENTS.md                    # Skill inventory
├── SKILL.md                     # Root plugin manifest
├── deal-office-hours/SKILL.md   # 6 forcing questions for RE deals
├── deal-ceo-review/SKILL.md     # 10-star deal analysis, 4 modes
├── deal-eng-review/SKILL.md     # Pipeline architecture review
├── lien-audit/SKILL.md          # Lien priority security audit
├── qa-property/SKILL.md         # Property data QA with browser
├── eval-judge/SKILL.md          # LLM-as-judge for AUTOLOOP
├── deal-review/SKILL.md         # Pre-deploy PR review
├── deal-ship/SKILL.md           # Test → review → deploy
├── market-intel/SKILL.md        # Comp analysis before bidding
├── nexus-retro/SKILL.md         # Weekly ecosystem retrospective
├── test/                        # Eval infrastructure
│   ├── helpers/
│   │   ├── llm-judge.ts         # LLM-as-judge evaluator
│   │   ├── eval-store.ts        # Run persistence + comparison
│   │   └── touchfiles.ts        # Diff-based test selection
│   └── skill-e2e-*.test.ts
└── docs/
    └── skills.md                # Auto-generated skill catalog
```

## Upstream sync
```bash
git remote add upstream https://github.com/garrytan/gstack.git
git fetch upstream main
git log upstream/main --oneline -20 --since='7 days ago'
# Cherry-pick: test/, browse/, cso/ updates only
# Never cherry-pick: office-hours/, plan-ceo-review/, telemetry, YC branding
```

## Key conventions
- SKILL.md files define agent behavior — each skill is a specialist role
- Skills are invoked via /skill-name in Claude Code
- NEVER-LIE rule: exact values only, invented numbers = failure
- Cost discipline: $10/session MAX across all eval runs
- Browser daemon (GStack /browse) is a peer dependency, not forked

## Domains
- Foreclosure auctions (Brevard County FL)
- Lien priority analysis
- Property valuation and comps
- BidDeed.AI pipeline code
- ZoneWise zoning intelligence
