#!/usr/bin/env python3
"""
everest-stack Property Scraper — Autonomous Data Collection
============================================================
Wires BCPAO GIS, BCPAO Property, and AcclaimWeb into /qa-property and /lien-audit.

Fixes:
1. BCPAO GIS: Wildcards on OWNER1 + OWNER2, handles trusts/LLCs
2. BCPAO Property API: Fallback to GIS when API returns 403
3. AcclaimWeb: Extracts ASP.NET ViewState/validation tokens before POST

Usage:
  python3 scrapers/property_scraper.py --owner "HORL" --mode full
  python3 scrapers/property_scraper.py --case "05-2025-CC-022459" --mode lien
  python3 scrapers/property_scraper.py --address "1234 Atlantic Blvd" --mode qa
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing dependencies...")
    os.system("pip install requests beautifulsoup4 --break-system-packages -q 2>/dev/null")
    import requests
    from bs4 import BeautifulSoup

# ============================================================
# CONFIG
# ============================================================
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

BCPAO_GIS_URL = "https://gis.brevardfl.gov/gissrv/rest/services/Base_Map/Parcel_New_WKID2881/MapServer/5/query"
BCPAO_API_URL = "https://www.bcpao.us/api/v1/search"
ACCLAIMWEB_BASE = "https://vaclmweb1.brevardclerk.us/AcclaimWeb"

OUTPUT_DIR = Path.home() / ".everest-stack"
DEALS_DIR = OUTPUT_DIR / "deals"
AUDITS_DIR = OUTPUT_DIR / "audits"
QA_DIR = OUTPUT_DIR / "qa"

for d in [DEALS_DIR, AUDITS_DIR, QA_DIR]:
    d.mkdir(parents=True, exist_ok=True)


# ============================================================
# FIX 1: BCPAO GIS — Wildcard OWNER1 + OWNER2, trusts, LLCs
# ============================================================
def search_bcpao_gis(owner_name: str) -> list:
    """Search BCPAO GIS API with wildcards on both owner fields.
    Handles trusts, LLCs, and partial name matches."""

    results = []
    # Clean the name — strip common suffixes for broader search
    clean = owner_name.strip().upper()

    # Build multiple WHERE clauses to catch trusts/LLCs
    queries = [
        f"UPPER(OWNER1) LIKE '%{clean}%'",
        f"UPPER(OWNER2) LIKE '%{clean}%'",
    ]

    # If name has space, also try last name only
    parts = clean.split()
    if len(parts) > 1:
        last_name = parts[-1] if len(parts[-1]) > 2 else parts[0]
        queries.append(f"UPPER(OWNER1) LIKE '%{last_name}%'")

    out_fields = (
        "ACCOUNT,OWNER1,OWNER2,SITEADDR,LEGAL1,LEGAL2,"
        "JUSTVAL,BLDGVAL,LANDVAL,SQFT,YRBLT,BEDS,BATHS,USECODE,"
        "CENSUS,NBHD"
    )

    seen_accounts = set()

    for where in queries:
        try:
            params = {
                "where": where,
                "outFields": out_fields,
                "f": "json",
                "returnGeometry": "false",
            }
            r = requests.get(BCPAO_GIS_URL, params=params, headers=HEADERS, timeout=15)
            if r.status_code == 200:
                data = r.json()
                for feat in data.get("features", []):
                    acct = feat["attributes"].get("ACCOUNT", "")
                    if acct and acct not in seen_accounts:
                        seen_accounts.add(acct)
                        results.append(feat["attributes"])
        except Exception as e:
            print(f"  GIS query error ({where[:40]}...): {e}")

    return results


def format_bcpao_result(attrs: dict) -> dict:
    """Format BCPAO GIS attributes into structured output."""
    return {
        "account": attrs.get("ACCOUNT", ""),
        "owner1": attrs.get("OWNER1", ""),
        "owner2": attrs.get("OWNER2", ""),
        "address": attrs.get("SITEADDR", ""),
        "legal1": attrs.get("LEGAL1", ""),
        "legal2": attrs.get("LEGAL2", ""),
        "just_value": attrs.get("JUSTVAL", 0),
        "building_value": attrs.get("BLDGVAL", 0),
        "land_value": attrs.get("LANDVAL", 0),
        "sqft": attrs.get("SQFT", 0),
        "year_built": attrs.get("YRBLT", 0),
        "beds": attrs.get("BEDS", 0),
        "baths": attrs.get("BATHS", 0),
        "use_code": attrs.get("USECODE", ""),
        "census_tract": attrs.get("CENSUS", ""),
        "neighborhood": attrs.get("NBHD", ""),
    }


# ============================================================
# FIX 2: BCPAO Property API — Fallback chain
# ============================================================
def search_bcpao_property(owner_name: str) -> list:
    """Try BCPAO Property API, fall back to GIS if 403."""

    # Attempt 1: Direct API
    for endpoint in [
        f"{BCPAO_API_URL}?owner={owner_name}&activeonly=true",
        f"{BCPAO_API_URL}?owner={owner_name}",
    ]:
        try:
            r = requests.get(endpoint, headers=HEADERS, timeout=10)
            if r.status_code == 200:
                data = r.json()
                if isinstance(data, list) and len(data) > 0:
                    print(f"  BCPAO API: found {len(data)} results")
                    return data
        except Exception:
            pass

    # Attempt 2: Fall back to GIS (always works)
    print("  BCPAO API returned 403, falling back to GIS...")
    gis_results = search_bcpao_gis(owner_name)
    return [format_bcpao_result(r) for r in gis_results]


# ============================================================
# FIX 3: AcclaimWeb — ViewState token extraction
# ============================================================
def search_acclaimweb(last_name: str, first_name: str = "") -> list:
    """Search AcclaimWeb with proper ASP.NET ViewState handling."""

    session = requests.Session()
    session.headers.update(HEADERS)
    results = []

    # Step 1: GET the search page to extract ViewState + validation tokens
    try:
        search_url = f"{ACCLAIMWEB_BASE}/search/party"
        r = session.get(search_url, timeout=15)
        if r.status_code != 200:
            print(f"  AcclaimWeb GET failed: HTTP {r.status_code}")
            return results

        soup = BeautifulSoup(r.text, "html.parser")

        # Extract ASP.NET hidden fields
        viewstate = ""
        viewstate_gen = ""
        event_validation = ""

        vs_tag = soup.find("input", {"name": "__VIEWSTATE"})
        if vs_tag:
            viewstate = vs_tag.get("value", "")

        vsg_tag = soup.find("input", {"name": "__VIEWSTATEGENERATOR"})
        if vsg_tag:
            viewstate_gen = vsg_tag.get("value", "")

        ev_tag = soup.find("input", {"name": "__EVENTVALIDATION"})
        if ev_tag:
            event_validation = ev_tag.get("value", "")

        if not viewstate:
            print("  AcclaimWeb: no ViewState found, trying direct POST...")

    except Exception as e:
        print(f"  AcclaimWeb GET error: {e}")
        return results

    # Step 2: POST with extracted tokens
    try:
        form_data = {
            "__VIEWSTATE": viewstate,
            "__VIEWSTATEGENERATOR": viewstate_gen,
            "__EVENTVALIDATION": event_validation,
            "ctl00$ContentPlaceHolder1$txtLastName": last_name.upper(),
            "ctl00$ContentPlaceHolder1$txtFirstName": first_name.upper() if first_name else "",
            "ctl00$ContentPlaceHolder1$ddlPartyType": "Both",
            "ctl00$ContentPlaceHolder1$btnSearch": "Search",
        }

        r = session.post(search_url, data=form_data, timeout=15, allow_redirects=True)
        print(f"  AcclaimWeb POST: HTTP {r.status_code}, {len(r.text)} bytes")

        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")

            # Parse results table
            table = soup.find("table", {"id": lambda x: x and "grid" in x.lower()}) or \
                    soup.find("table", {"class": lambda x: x and "grid" in str(x).lower()})

            if not table:
                # Try finding any table with data rows
                tables = soup.find_all("table")
                for t in tables:
                    rows = t.find_all("tr")
                    if len(rows) > 1:  # header + data
                        cells = rows[1].find_all("td")
                        if len(cells) >= 3:
                            table = t
                            break

            if table:
                rows = table.find_all("tr")
                headers_row = rows[0] if rows else None
                header_names = []
                if headers_row:
                    header_names = [th.get_text(strip=True) for th in headers_row.find_all(["th", "td"])]

                for row in rows[1:]:
                    cells = row.find_all("td")
                    if cells:
                        entry = {}
                        for i, cell in enumerate(cells):
                            key = header_names[i] if i < len(header_names) else f"col_{i}"
                            entry[key] = cell.get_text(strip=True)

                            # Check for links (document viewer links)
                            link = cell.find("a", href=True)
                            if link:
                                entry[f"{key}_link"] = link["href"]

                        results.append(entry)

                print(f"  AcclaimWeb: found {len(results)} instruments")
            else:
                # Check if "no results" message
                page_text = soup.get_text()
                if "no results" in page_text.lower() or "no records" in page_text.lower():
                    print("  AcclaimWeb: no records found for this name")
                else:
                    print(f"  AcclaimWeb: could not parse results table")
                    # Save raw HTML for debugging
                    debug_path = OUTPUT_DIR / "debug_acclaimweb.html"
                    debug_path.write_text(r.text)
                    print(f"  Debug HTML saved to {debug_path}")

    except Exception as e:
        print(f"  AcclaimWeb POST error: {e}")

    return results


def classify_instruments(instruments: list) -> dict:
    """Classify AcclaimWeb instruments by type for lien analysis."""
    classified = {
        "mortgages": [],
        "satisfactions": [],
        "hoa_liens": [],
        "judgment_liens": [],
        "lis_pendens": [],
        "federal_tax_liens": [],
        "other": [],
    }

    mortgage_keywords = ["mortgage", "mtg", "deed of trust", "heloc"]
    satisfaction_keywords = ["satisfaction", "release", "discharge"]
    hoa_keywords = ["hoa", "association", "condo", "homeowner"]
    judgment_keywords = ["judgment", "jdgmt"]
    lis_keywords = ["lis pendens"]
    federal_keywords = ["federal tax", "irs", "internal revenue"]

    for inst in instruments:
        doc_type = " ".join(str(v).lower() for v in inst.values())

        if any(k in doc_type for k in satisfaction_keywords):
            classified["satisfactions"].append(inst)
        elif any(k in doc_type for k in federal_keywords):
            classified["federal_tax_liens"].append(inst)
        elif any(k in doc_type for k in lis_keywords):
            classified["lis_pendens"].append(inst)
        elif any(k in doc_type for k in hoa_keywords):
            classified["hoa_liens"].append(inst)
        elif any(k in doc_type for k in judgment_keywords):
            classified["judgment_liens"].append(inst)
        elif any(k in doc_type for k in mortgage_keywords):
            classified["mortgages"].append(inst)
        else:
            classified["other"].append(inst)

    return classified


# ============================================================
# UNIFIED RUNNER
# ============================================================
def run_full_audit(owner_name: str, case_number: str = "", mode: str = "full"):
    """Run complete property data collection across all sources."""

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    date_slug = datetime.now().strftime("%Y%m%d")

    print("=" * 60)
    print(f"PROPERTY SCRAPER — {mode.upper()} MODE")
    print(f"Owner: {owner_name}")
    if case_number:
        print(f"Case: {case_number}")
    print(f"Time: {timestamp}")
    print("=" * 60)

    report = {
        "owner": owner_name,
        "case": case_number,
        "mode": mode,
        "timestamp": timestamp,
        "bcpao": {"status": "pending", "data": []},
        "acclaimweb": {"status": "pending", "data": [], "classified": {}},
        "lien_assessment": {},
    }

    # 1. BCPAO (property data)
    print(f"\n[1/3] BCPAO — Searching for '{owner_name}'...")

    # Try property API first, falls back to GIS automatically
    bcpao_results = search_bcpao_property(owner_name)

    if not bcpao_results:
        # If nothing found, try GIS directly with broader wildcards
        print("  Trying GIS with broader search...")
        parts = owner_name.upper().split()
        for part in parts:
            if len(part) > 2:
                gis_results = search_bcpao_gis(part)
                if gis_results:
                    bcpao_results = [format_bcpao_result(r) for r in gis_results]
                    break

    if bcpao_results:
        report["bcpao"]["status"] = "found"
        report["bcpao"]["data"] = bcpao_results
        print(f"  ✅ Found {len(bcpao_results)} properties:")
        for prop in bcpao_results:
            addr = prop.get("address") or prop.get("SITEADDR", "unknown")
            val = prop.get("just_value") or prop.get("JUSTVAL", 0)
            print(f"     {addr} | Just Value: ${val:,.0f}" if isinstance(val, (int, float)) else f"     {addr} | Value: {val}")
    else:
        report["bcpao"]["status"] = "not_found"
        print("  ⚠️ No properties found in BCPAO")

    # 2. AcclaimWeb (recorded instruments)
    print(f"\n[2/3] AcclaimWeb — Searching instruments for '{owner_name}'...")

    parts = owner_name.strip().split()
    last_name = parts[-1] if parts else owner_name
    first_name = parts[0] if len(parts) > 1 else ""

    acclaim_results = search_acclaimweb(last_name, first_name)

    if acclaim_results:
        report["acclaimweb"]["status"] = "found"
        report["acclaimweb"]["data"] = acclaim_results
        classified = classify_instruments(acclaim_results)
        report["acclaimweb"]["classified"] = {k: len(v) for k, v in classified.items()}

        print(f"  ✅ Found {len(acclaim_results)} recorded instruments:")
        print(f"     Mortgages: {len(classified['mortgages'])}")
        print(f"     Satisfactions: {len(classified['satisfactions'])}")
        print(f"     HOA liens: {len(classified['hoa_liens'])}")
        print(f"     Judgment liens: {len(classified['judgment_liens'])}")
        print(f"     Lis pendens: {len(classified['lis_pendens'])}")
        print(f"     Federal tax liens: {len(classified['federal_tax_liens'])}")
        print(f"     Other: {len(classified['other'])}")

        # Lien assessment for HOA foreclosures
        active_mortgages = len(classified["mortgages"]) - len(classified["satisfactions"])
        if active_mortgages > 0:
            report["lien_assessment"] = {
                "senior_mortgage_risk": "HIGH",
                "active_mortgages_estimate": max(0, active_mortgages),
                "recommendation": "DO_NOT_BID_WITHOUT_PAYOFF_VERIFICATION",
            }
            print(f"\n  🔴 CRITICAL: ~{max(0, active_mortgages)} potentially unsatisfied mortgage(s)")
            print(f"     HOA foreclosure + active mortgage = SENIOR DEBT SURVIVES")
        elif len(classified["mortgages"]) > 0:
            report["lien_assessment"] = {
                "senior_mortgage_risk": "LOW",
                "note": "Mortgages found but satisfactions recorded",
                "recommendation": "VERIFY_SATISFACTION_MATCHES_MORTGAGE",
            }
            print(f"\n  ✅ Mortgages appear satisfied — verify each satisfaction matches")
        else:
            report["lien_assessment"] = {
                "senior_mortgage_risk": "NONE_FOUND",
                "recommendation": "CLEAR_IF_NO_OTHER_ISSUES",
            }
            print(f"\n  ✅ No mortgages found on record")

        if classified["federal_tax_liens"]:
            print(f"  ⚠️ Federal tax lien(s) found — 120-day redemption period applies")

    else:
        report["acclaimweb"]["status"] = "no_results"
        print("  ⚠️ No instruments found in AcclaimWeb")

    # 3. Save report
    print(f"\n[3/3] Saving report...")

    if mode == "lien":
        report_path = AUDITS_DIR / f"{last_name.lower()}-audit-{date_slug}.json"
    elif mode == "qa":
        report_path = QA_DIR / f"{last_name.lower()}-qa-{date_slug}.json"
    else:
        report_path = DEALS_DIR / f"{last_name.lower()}-intel-{date_slug}.json"

    report_path.write_text(json.dumps(report, indent=2, default=str))
    print(f"  ✅ Report saved: {report_path}")

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  BCPAO: {report['bcpao']['status']} ({len(report['bcpao']['data'])} properties)")
    print(f"  AcclaimWeb: {report['acclaimweb']['status']} ({len(report['acclaimweb']['data'])} instruments)")
    if report["lien_assessment"]:
        risk = report["lien_assessment"].get("senior_mortgage_risk", "UNKNOWN")
        rec = report["lien_assessment"].get("recommendation", "")
        print(f"  Senior mortgage risk: {risk}")
        print(f"  Recommendation: {rec}")
    print("=" * 60)

    return report


# ============================================================
# CLI
# ============================================================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="everest-stack Property Scraper")
    parser.add_argument("--owner", required=True, help="Owner name to search")
    parser.add_argument("--case", default="", help="Case number (optional)")
    parser.add_argument("--mode", default="full", choices=["full", "lien", "qa"],
                        help="Audit mode: full, lien, or qa")
    args = parser.parse_args()

    run_full_audit(args.owner, args.case, args.mode)
