# Phase 4b — Full Title Search Pipeline

## Prerequisites
- [ ] Read CLAUDE.md (root directive with full 13-point spec)
- [ ] Clone brevard-bidder-scraper as reference: `git clone https://github.com/breverdbidder/brevard-bidder-scraper.git /home/claude/brevard-bidder-scraper`
- [ ] Install deps: `pip install requests beautifulsoup4 playwright pdfplumber --break-system-packages && playwright install chromium`

## Build Tasks

### 1. Fix instrument classification (expand doc type map)
- [ ] Update `scrapers/property_scraper.py` `classify_instruments()` with full type map from CLAUDE.md §4
- [ ] Add: deed (WD, QCD), assignment (ASGN), HOA keywords expansion
- [ ] Test: re-classify the 5 "other" HORL instruments

### 2. Multi-party AcclaimWeb search
- [ ] Update `scrapers/acclaimweb_playwright.py` to accept list of party names
- [ ] Wire into `property_scraper.py`: search ALL owners from BCPAO (OWNER_NAME1 + OWNER_NAME2)
- [ ] Test: search both HORL and TORRES for case 05-2025-CC-022459

### 3. Mortgage-satisfaction matching
- [ ] New function `match_mortgages_to_satisfactions()` in property_scraper.py
- [ ] Match by CFN reference, book/page, or chronological order
- [ ] Output: list of ACTIVE (unsatisfied) mortgages with amounts

### 4. BECA case search (port from brevard-bidder-scraper)
- [ ] Create `scrapers/beca_playwright.py`
- [ ] Port case search from `brevard-bidder-scraper/scripts/beca_scraper_v3.py`
- [ ] Accept case number → return case details (plaintiff, defendant, status, filing date)

### 5. BECA judgment extraction
- [ ] Add PDF download + extraction to `beca_playwright.py`
- [ ] Port 12 regex patterns from `brevard-bidder-scraper/src/scrapers/beca_final_judgment_scraper.py`
- [ ] Extract: final judgment amount, date, terms
- [ ] Requires: `pdfplumber` for PDF text extraction

### 6. Tax Collector scraper
- [ ] Create `scrapers/tax_collector.py`
- [ ] Query brevardtaxcollector.com by account number (2531736)
- [ ] Extract: current year paid/unpaid, prior delinquencies, special assessments

### 7. RealTDM tax certificate search (port)
- [ ] Create `scrapers/realtdm_scraper.py`
- [ ] Port from `brevard-bidder-scraper/src/scrapers/realtdm_scraper.py`
- [ ] Check for outstanding tax certificates on parcel

### 8. Lien priority analysis (port)
- [ ] Create `scrapers/lien_priority.py`
- [ ] Port from `brevard-bidder-scraper/.claude/skills/biddeed-lien-discovery/scripts/analyze_lien_priority.py`
- [ ] Wire all data from steps 1-7 into priority calculator
- [ ] Output: lien hierarchy table with survive/extinguish status per lien

### 9. Max bid + recommendation functions
- [ ] Add `calculate_max_bid()` to property_scraper.py
- [ ] Formula: (ARV × 70%) - Repairs - $10K - MIN($25K, 15% × ARV)
- [ ] Adjust for HOA: subtract surviving mortgage payoff
- [ ] Add `determine_recommendation()`: BID (≥75%) / REVIEW (60-74%) / SKIP (<60%)

### 10. Unified title-search mode
- [ ] Add `--mode title-search` to property_scraper.py
- [ ] Orchestrate all 13 steps sequentially
- [ ] Output: JSON report to `~/.everest-stack/audits/`
- [ ] Every field: "verified" or "source_unavailable" — NEVER "unknown"

### 11. HTML report generator
- [ ] Create `scrapers/report_generator.py`
- [ ] Takes JSON from step 10 → generates HTML report
- [ ] Use BidDeed.AI house brand: navy #1E3A5F, orange #F59E0B, Inter font
- [ ] Include BCPAO photo link, Google Maps link, all verification links

### 12. Tests
- [ ] Add test assertions for title-search mode
- [ ] Add HORL test fixture with expected outputs
- [ ] All existing 64 tests must still pass

## Validation
- [ ] Run: `python3 scrapers/property_scraper.py --owner "AMY HORL" --case "05-2025-CC-022459-XXCC-BC" --mode title-search`
- [ ] Verify: zero "unknown" fields in output
- [ ] Verify: judgment amount extracted
- [ ] Verify: tax status checked
- [ ] Verify: ALL party names searched in AcclaimWeb
- [ ] Push to GitHub and deploy to Hetzner
