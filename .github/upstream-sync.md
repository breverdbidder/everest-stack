# Upstream Sync Protocol

## Setup (once)
```bash
git remote add upstream https://github.com/garrytan/gstack.git
```

## Weekly sync (runs in weekly-health.yml)
```bash
git fetch upstream main
git log upstream/main --oneline -20 --since='7 days ago'
```

## Cherry-pick targets
- test/ — eval infrastructure
- browse/ — browser daemon updates  
- cso/ — security audit methodology

## Never cherry-pick
- office-hours/ — we have /deal-office-hours
- plan-ceo-review/ — we have /deal-ceo-review
- Telemetry/analytics code
- YC application prompts
