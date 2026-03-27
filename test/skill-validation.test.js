/**
 * Tier 1: Static skill validation — free, <2s.
 * Validates frontmatter, structure, and domain-specific requirements
 * for all SKILL.md files in the repo.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const { validateSkill, validateAllSkills } = require("./helpers/skill-parser");

const ROOT = path.resolve(__dirname, "..");
const SKILLS = [
  "deal-office-hours",
  "deal-ceo-review",
  "deal-eng-review",
  "lien-audit",
  "qa-property",
  "eval-judge",
  "deal-review",
  "deal-ship",
  "market-intel",
  "nexus-retro",
];

describe("Skill validation", () => {
  it("all 10 skill directories exist with SKILL.md", () => {
    for (const skill of SKILLS) {
      const p = path.join(ROOT, skill, "SKILL.md");
      assert.ok(fs.existsSync(p), `Missing: ${skill}/SKILL.md`);
    }
  });

  it("root SKILL.md exists", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "SKILL.md")));
  });

  it("ETHOS.md exists", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "ETHOS.md")));
  });

  it("AGENTS.md exists", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "AGENTS.md")));
  });

  it("CLAUDE.md exists", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "CLAUDE.md")));
  });

  it("all skills have valid frontmatter", () => {
    const results = validateAllSkills(ROOT);
    for (const [name, result] of Object.entries(results)) {
      assert.ok(
        result.valid,
        `${name}: ${result.errors.join(", ")}`
      );
    }
  });

  it("deal-office-hours has 6 forcing questions", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-office-hours", "SKILL.md"),
      "utf-8"
    );
    const questions = content.match(/### Question \d+:/g) || [];
    assert.strictEqual(questions.length, 6, "Expected 6 forcing questions");
  });

  it("deal-office-hours has anti-sycophancy rules", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-office-hours", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("Anti-Sycophancy"), "Missing anti-sycophancy section");
  });

  it("deal-office-hours has max bid formula", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-office-hours", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("ARV × 70%"), "Missing max bid formula");
  });

  it("deal-office-hours has BID/REVIEW/SKIP thresholds", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-office-hours", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("≥ 75%"), "Missing BID threshold");
    assert.ok(content.includes("60-74%"), "Missing REVIEW threshold");
    assert.ok(content.includes("< 60%"), "Missing SKIP threshold");
  });

  it("lien-audit has PRE-BID and POST-ACQUISITION modes", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "lien-audit", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("PRE-BID"), "Missing PRE-BID mode");
    assert.ok(content.includes("POST-ACQUISITION"), "Missing POST-ACQUISITION mode");
    assert.ok(content.includes("EMERGENCY"), "Missing EMERGENCY mode");
  });

  it("lien-audit covers HOA foreclosure danger", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "lien-audit", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("Senior mortgage SURVIVES"), "Missing HOA senior mortgage warning");
    assert.ok(content.includes("HOA/COA Foreclosure"), "Missing HOA classification");
  });

  it("lien-audit references AcclaimWeb", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "lien-audit", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("AcclaimWeb"), "Missing AcclaimWeb reference");
    assert.ok(content.includes("vaclmweb1.brevardclerk.us"), "Missing AcclaimWeb URL");
  });

  it("lien-audit has confidence rating system", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "lien-audit", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("9/10"), "Missing 9/10 confidence gate");
    assert.ok(content.includes("Confidence Rating"), "Missing confidence section");
  });

  it("lien-audit covers federal tax lien redemption", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "lien-audit", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("120-day"), "Missing 120-day federal redemption period");
  });

  it("lien-audit has CLEARED/NEEDS_VERIFICATION/DO_NOT_BID outputs", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "lien-audit", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("CLEARED"), "Missing CLEARED status");
    assert.ok(content.includes("NEEDS_VERIFICATION"), "Missing NEEDS_VERIFICATION status");
    assert.ok(content.includes("DO_NOT_BID"), "Missing DO_NOT_BID status");
  });

  it("lien-audit references RealTDM for tax certificates", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "lien-audit", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("RealTDM"), "Missing RealTDM reference");
  });

  it("lien-audit references BCPAO", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "lien-audit", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("BCPAO"), "Missing BCPAO reference");
    assert.ok(content.includes("gis.brevardfl.gov"), "Missing BCPAO URL");
  });

  it("ETHOS.md contains all 5 principles", () => {
    const content = fs.readFileSync(path.join(ROOT, "ETHOS.md"), "utf-8");
    assert.ok(content.includes("Exactness Over Velocity"), "Missing principle 1");
    assert.ok(content.includes("Verify Before You Bid"), "Missing principle 2");
    assert.ok(content.includes("Autonomous Until Irreversible"), "Missing principle 3");
    assert.ok(content.includes("Cost Discipline"), "Missing principle 4");
    assert.ok(content.includes("The Deal Decides"), "Missing principle 5");
  });

  it("ETHOS.md has NEVER-LIE rule", () => {
    const content = fs.readFileSync(path.join(ROOT, "ETHOS.md"), "utf-8");
    assert.ok(content.includes("NEVER-LIE"), "Missing NEVER-LIE rule");
  });

  it("AGENTS.md lists all 10 skills", () => {
    const content = fs.readFileSync(path.join(ROOT, "AGENTS.md"), "utf-8");
    for (const skill of SKILLS) {
      assert.ok(
        content.includes(`/${skill}`),
        `AGENTS.md missing /${skill}`
      );
    }
  });

  it("package.json has claude-plugin metadata", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
    );
    assert.ok(pkg["claude-plugin"], "Missing claude-plugin section");
    assert.strictEqual(pkg["claude-plugin"].skills.length, 10, "Expected 10 skills in plugin manifest");
  });

  it("deal-office-hours has completion status section", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-office-hours", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("Completion status"), "Missing completion status");
    assert.ok(content.includes("DONE"), "Missing DONE status");
    assert.ok(content.includes("NEEDS_VERIFICATION"), "Missing NEEDS_VERIFICATION status");
  });

  it("test fixtures exist", () => {
    assert.ok(
      fs.existsSync(path.join(ROOT, "test", "fixtures", "deal-scenarios.json")),
      "Missing deal-scenarios.json"
    );
    assert.ok(
      fs.existsSync(path.join(ROOT, "test", "fixtures", "lien-scenarios.json")),
      "Missing lien-scenarios.json"
    );
  });

  it("deal scenarios fixture has 10 scenarios", () => {
    const data = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, "test", "fixtures", "deal-scenarios.json"),
        "utf-8"
      )
    );
    assert.strictEqual(data.scenarios.length, 10, "Expected 10 deal scenarios");
  });

  it("lien scenarios fixture has 10 scenarios", () => {
    const data = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, "test", "fixtures", "lien-scenarios.json"),
        "utf-8"
      )
    );
    assert.strictEqual(data.scenarios.length, 10, "Expected 10 lien scenarios");
  });

  // === PHASE 2: C-Level Agent Skills ===

  it("deal-ceo-review has 4 strategic modes", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-ceo-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("AGGRESSIVE"), "Missing AGGRESSIVE mode");
    assert.ok(content.includes("SELECTIVE"), "Missing SELECTIVE mode");
    assert.ok(content.includes("DEFENSIVE"), "Missing DEFENSIVE mode");
    assert.ok(content.includes("REBALANCE"), "Missing REBALANCE mode");
  });

  it("deal-ceo-review has anti-sycophancy rules", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-ceo-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Anti-Sycophancy"), "Missing anti-sycophancy section");
    assert.ok(content.includes("Never say"), "Missing 'Never say' enforcement");
  });

  it("deal-ceo-review has cognitive patterns", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-ceo-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Cognitive Patterns"), "Missing cognitive patterns section");
    assert.ok(content.includes("Lien priority paranoia"), "Missing lien priority pattern");
    assert.ok(content.includes("Concentration kills"), "Missing concentration pattern");
  });

  it("deal-ceo-review has premise challenge", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-ceo-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Premise 1"), "Missing premise 1");
    assert.ok(content.includes("Premise 2"), "Missing premise 2");
    assert.ok(content.includes("Premise 3"), "Missing premise 3");
  });

  it("deal-ceo-review has completion status", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-ceo-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Completion status"), "Missing completion status");
    assert.ok(content.includes("DONE"), "Missing DONE status");
    assert.ok(content.includes("NEEDS_DATA"), "Missing NEEDS_DATA status");
  });

  it("deal-eng-review has scope classification", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-eng-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Scraper change"), "Missing scraper scope");
    assert.ok(content.includes("Pipeline stage"), "Missing pipeline scope");
    assert.ok(content.includes("Data model"), "Missing data model scope");
    assert.ok(content.includes("Infrastructure"), "Missing infrastructure scope");
  });

  it("deal-eng-review has failure mode analysis", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-eng-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Failure Mode"), "Missing failure mode section");
    assert.ok(content.includes("Probability"), "Missing probability column");
    assert.ok(content.includes("Blast radius"), "Missing blast radius concept");
  });

  it("deal-eng-review has anti-sycophancy rules", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-eng-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Anti-Sycophancy"), "Missing anti-sycophancy section");
    assert.ok(content.includes("Never say"), "Missing 'Never say' enforcement");
  });

  it("deal-eng-review has GO/NO-GO verdicts", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-eng-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("GO"), "Missing GO verdict");
    assert.ok(content.includes("NO_GO") || content.includes("NO-GO"), "Missing NO-GO verdict");
    assert.ok(content.includes("CONDITIONAL"), "Missing CONDITIONAL verdict");
  });

  it("deal-eng-review covers scraper review checklist", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-eng-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Anti-detection"), "Missing anti-detection check");
    assert.ok(content.includes("Circuit breaker"), "Missing circuit breaker check");
    assert.ok(content.includes("Response validation"), "Missing response validation check");
  });

  it("deal-review has severity levels", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("CRITICAL"), "Missing CRITICAL severity");
    assert.ok(content.includes("WARNING"), "Missing WARNING severity");
    assert.ok(content.includes("SHIP"), "Missing SHIP verdict");
    assert.ok(content.includes("BLOCK"), "Missing BLOCK verdict");
  });

  it("deal-review has domain-specific review patterns", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Data Integrity"), "Missing data integrity pattern");
    assert.ok(content.includes("Scraper Fragility"), "Missing scraper fragility pattern");
    assert.ok(content.includes("Silent Failures"), "Missing silent failures pattern");
    assert.ok(content.includes("Cost Regression"), "Missing cost regression pattern");
    assert.ok(content.includes("Security"), "Missing security pattern");
  });

  it("deal-review has anti-sycophancy rules", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Anti-Sycophancy"), "Missing anti-sycophancy section");
    assert.ok(content.includes("Never say"), "Missing 'Never say' enforcement");
  });

  it("deal-review checks for scope drift", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-review", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Scope Drift") || content.includes("SCOPE CREEP"), "Missing scope drift detection");
  });

  it("deal-ship has pre-deploy checklist", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-ship", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Pre-Deploy Checklist"), "Missing pre-deploy checklist");
    assert.ok(content.includes("hardcoded"), "Missing hardcoded keys check");
    assert.ok(content.includes("Commit messages") || content.includes("commit messages"), "Missing commit message check");
  });

  it("deal-ship has post-deploy verification", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-ship", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Post-Deploy Verification"), "Missing post-deploy verification");
    assert.ok(content.includes("Cloudflare") || content.includes("deployment"), "Missing deploy target check");
  });

  it("deal-ship enforces tests-must-pass gate", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-ship", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Tests must pass"), "Missing tests-must-pass rule");
  });

  it("deal-ship has ship log output", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "deal-ship", "SKILL.md"), "utf-8"
    );
    assert.ok(content.includes("Ship Log"), "Missing ship log");
    assert.ok(content.includes("SHIPPED"), "Missing SHIPPED status");
    assert.ok(content.includes("BLOCKED"), "Missing BLOCKED status");
  });

  it("all Phase 2 skills are fully implemented (not stubs)", () => {
    for (const skill of ["deal-ceo-review", "deal-eng-review", "deal-review", "deal-ship"]) {
      const content = fs.readFileSync(path.join(ROOT, skill, "SKILL.md"), "utf-8");
      assert.ok(!content.includes("STUB"), `${skill} is still a stub`);
      assert.ok(content.split("\n").length > 100, `${skill} too short (${content.split("\n").length} lines)`);
    }
  });
});
