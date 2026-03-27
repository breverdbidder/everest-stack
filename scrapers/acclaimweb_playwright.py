#!/usr/bin/env python3
"""
AcclaimWeb Playwright Scraper for everest-stack
================================================
Wired from brevard-bidder-scraper/src/scrapers/acclaimweb_scraper_native.py

AcclaimWeb blocks direct HTTP (503). Must use headless browser:
1. Load disclaimer page → click "I accept"
2. Navigate to SearchTypeName
3. Fill party name → submit
4. Parse results table → classify instruments

Requires: pip install playwright && playwright install chromium
"""

import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Instrument classification
MORTGAGE_TYPES = {"MTG", "SMTG", "AMTG", "MTGMOD", "DEED OF TRUST"}
SATISFACTION_TYPES = {"SAT", "SATIS", "SATMTG", "RELEASE", "DISCHARGE"}
LIEN_TYPES = {"LN", "LIEN", "JDGMT", "JUDGMENT", "CODE"}
LP_TYPES = {"LP", "LIS", "LISPENDENS"}
FED_TYPES = {"FTL", "FEDTAXLIEN"}


def classify_doc_type(doc_type: str, parties: str = "") -> str:
    dt = doc_type.upper().strip()
    parties_up = parties.upper()

    if dt in SATISFACTION_TYPES or "SAT" in dt:
        return "satisfaction"
    elif dt in MORTGAGE_TYPES or "MTG" in dt or "MORTGAGE" in dt:
        return "mortgage"
    elif dt in LP_TYPES or "LIS" in dt:
        return "lis_pendens"
    elif dt in FED_TYPES or "FEDERAL TAX" in dt:
        return "federal_tax_lien"
    elif dt in LIEN_TYPES or "LIEN" in dt or "JUDGMENT" in dt:
        if any(kw in parties_up for kw in ["HOA", "ASSOCIATION", "COMMUNITY", "CONDO"]):
            return "hoa_lien"
        return "judgment_lien"
    else:
        return "other"


async def search_acclaimweb_playwright(last_name: str, first_name: str = "") -> dict:
    """Search AcclaimWeb via Playwright headless browser."""

    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("  Installing playwright...")
        os.system("pip install playwright --break-system-packages -q 2>/dev/null")
        os.system("playwright install chromium 2>/dev/null")
        from playwright.async_api import async_playwright

    result = {
        "search_party": f"{last_name}, {first_name}".strip(", "),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "records": [],
        "classified": {
            "mortgages": [],
            "satisfactions": [],
            "hoa_liens": [],
            "judgment_liens": [],
            "lis_pendens": [],
            "federal_tax_liens": [],
            "other": [],
        },
        "success": False,
        "error": None,
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        )
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        try:
            # Step 1: Load disclaimer
            print("  [1/5] Loading AcclaimWeb disclaimer...")
            await page.goto(
                "https://vaclmweb1.brevardclerk.us/AcclaimWeb/search/Disclaimer?st=/AcclaimWeb/search/SearchTypeName",
                wait_until="networkidle",
                timeout=30000,
            )
            await asyncio.sleep(2)

            # Step 2: Accept disclaimer
            print("  [2/5] Accepting disclaimer...")
            accept = page.locator("input[value='I accept the conditions above.']")
            if await accept.count() > 0:
                await accept.click()
                await page.wait_for_load_state("networkidle")
                await asyncio.sleep(2)
            else:
                for sel in ["button:has-text('accept')", "input[type='submit']", "a:has-text('accept')"]:
                    btn = page.locator(sel)
                    if await btn.count() > 0:
                        await btn.first.click()
                        await page.wait_for_load_state("networkidle")
                        await asyncio.sleep(2)
                        break

            # Step 3: Navigate to name search if needed
            if "SearchTypeName" not in page.url:
                await page.goto(
                    "https://vaclmweb1.brevardclerk.us/AcclaimWeb/search/SearchTypeName",
                    wait_until="networkidle",
                    timeout=30000,
                )
                await asyncio.sleep(2)

            print(f"  [3/5] Searching for '{last_name}'...")

            # Fill search field
            filled = False
            for sel in [
                "input[name='GranteeName']",
                "input[name='gteeName']",
                "input[id*='Grantee']",
                "input[id*='gtee']",
                "input[name*='Grantee']",
                "input[placeholder*='Last Name']",
            ]:
                field = page.locator(sel)
                if await field.count() > 0:
                    search_term = f"{last_name}, {first_name}".strip(", ") if first_name else last_name
                    await field.first.fill(search_term)
                    filled = True
                    break

            if not filled:
                text_inputs = page.locator("input[type='text']:visible")
                if await text_inputs.count() > 0:
                    await text_inputs.first.fill(last_name)
                    filled = True

            if not filled:
                result["error"] = "Could not find search input field"
                return result

            # Step 4: Submit search
            print("  [4/5] Submitting search...")
            for sel in ["input[value='Search']", "button[type='submit']", "input[type='submit']"]:
                btn = page.locator(sel)
                if await btn.count() > 0 and await btn.first.is_visible():
                    await btn.first.click()
                    await page.wait_for_load_state("networkidle")
                    await asyncio.sleep(3)
                    break

            # Step 5: Parse results
            print("  [5/5] Parsing results...")
            content = await page.content()

            if "no records found" in content.lower() or "no results" in content.lower():
                result["success"] = True
                result["error"] = "No records found"
                return result

            rows = await page.locator("table tr").all()
            print(f"  Found {len(rows)} table rows")

            for row in rows[1:]:
                cols = await row.locator("td").all()
                if len(cols) < 4:
                    continue

                try:
                    record = {
                        "cfn": (await cols[0].inner_text()).strip() if len(cols) > 0 else "",
                        "doc_type": (await cols[1].inner_text()).strip() if len(cols) > 1 else "",
                        "recording_date": (await cols[2].inner_text()).strip() if len(cols) > 2 else "",
                        "parties": (await cols[3].inner_text()).strip() if len(cols) > 3 else "",
                        "amount": "",
                    }

                    # Try to get amount from additional columns
                    if len(cols) > 4:
                        record["amount"] = (await cols[4].inner_text()).strip()

                    if record["doc_type"]:
                        category = classify_doc_type(record["doc_type"], record["parties"])
                        record["category"] = category
                        result["records"].append(record)
                        result["classified"][category + "s" if not category.endswith("s") else category].append(record)

                except Exception:
                    continue

            result["success"] = True
            print(f"  ✅ Parsed {len(result['records'])} instruments")

        except Exception as e:
            result["error"] = str(e)
            print(f"  ❌ Playwright error: {e}")

        finally:
            await browser.close()

    return result


def run_sync(last_name: str, first_name: str = "") -> dict:
    """Synchronous wrapper for the async Playwright search."""
    return asyncio.run(search_acclaimweb_playwright(last_name, first_name))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="AcclaimWeb Playwright Scraper")
    parser.add_argument("--last-name", required=True)
    parser.add_argument("--first-name", default="")
    args = parser.parse_args()

    result = run_sync(args.last_name, args.first_name)
    print(json.dumps(result, indent=2, default=str))
