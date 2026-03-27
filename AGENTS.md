# everest-stack — Foreclosure Deal Intelligence

everest-stack is a collection of SKILL.md files that give AI agents structured roles
for foreclosure auction investing. Each skill is a specialist: deal evaluator, lien
auditor, property QA, market analyst, pipeline engineer, and more.

Upstream: [garrytan/gstack](https://github.com/garrytan/gstack) (architecture + eval infra)
Domain: Brevard County FL foreclosure auctions via [BidDeed.AI](https://biddeed.ai)

## Available skills

Invoke by name (e.g., `/deal-office-hours`).

| Skill | What it does | Origin |
|-------|-------------|--------|
| `/deal-office-hours` | 6 forcing questions that stress-test a deal before you bid. Start here. | GStack /office-hours (FULL REWRITE) |
| `/deal-ceo-review` | Strategic deal review: Aggressive, Selective, Defensive, or Rebalance mode. | GStack /plan-ceo-review (HEAVY REWRITE) |
| `/deal-eng-review` | Architecture review for BidDeed.AI pipeline, scrapers, and data flows. | GStack /plan-eng-review (MODERATE REWRITE) |
| `/lien-audit` | Lien priority security audit. Pre-bid (daily) and post-acquisition modes. | GStack /cso (FULL REWRITE) |
| `/qa-property` | Property data QA — cross-reference BCPAO, AcclaimWeb, RealForeclose, Maps. | GStack /qa (MODERATE REWRITE) |
| `/eval-judge` | LLM-as-judge evaluation for AUTOLOOP skill improvement pipeline. | GStack eval infra (ADAPT) |
| `/deal-review` | Pre-deploy code review for pipeline changes. Catches data integrity bugs. | GStack /review (MODERATE REWRITE) |
| `/deal-ship` | Test → review → push → deploy. One command for pipeline releases. | GStack /ship (MODERATE REWRITE) |
| `/market-intel` | Market intelligence: comps, demographics, rental rates, flood zones. | NEW (no GStack equivalent) |
| `/nexus-retro` | Weekly ecosystem retrospective across all repos and agents. | GStack /retro (MODERATE REWRITE) |

## Peer dependencies

- **GStack /browse** — headless browser daemon for /qa-property verification
- **GStack /careful, /freeze, /guard** — safety skills (use as-is, not forked)

## Build commands

```bash
npm install              # install dependencies
npm test                 # run free tests (<2s)
npm run test:evals       # run paid evals (diff-based, ~$4/run max)
```

## Key conventions

- SKILL.md files define agent behavior — edit these, not code
- ETHOS.md principles are injected into every skill context
- NEVER-LIE rule: exact values only across all skills
- Max bid formula: (ARV×70%)-Repairs-$10K-MIN($25K,15%ARV)
- Bid/judgment ratio: ≥75%=BID, 60-74%=REVIEW, <60%=SKIP
