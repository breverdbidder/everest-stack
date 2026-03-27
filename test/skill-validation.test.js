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
});
