/**
 * Touchfiles — diff-based eval test selection.
 * Ported from garrytan/gstack test/helpers/touchfiles.ts
 * Adapted: everest-stack skill dependencies, Node.js.
 *
 * Each test declares which files it depends on. When running evals,
 * only tests whose dependencies have changed are executed.
 */

const { execSync } = require("child_process");

/**
 * Dependency map: test file → files that trigger it.
 * Changes to GLOBAL_TOUCHFILES trigger ALL tests.
 */
const GLOBAL_TOUCHFILES = [
  "test/helpers/llm-judge.js",
  "test/helpers/eval-store.js",
  "test/helpers/skill-parser.js",
  "test/helpers/touchfiles.js",
  "ETHOS.md",
];

const TEST_DEPENDENCIES = {
  "test/skill-validation.test.js": [
    "*/SKILL.md",
    "SKILL.md",
    "AGENTS.md",
    "test/helpers/skill-parser.js",
  ],
  "test/skill-e2e-office-hours.test.js": [
    "deal-office-hours/SKILL.md",
    "test/fixtures/deal-scenarios.json",
  ],
  "test/skill-e2e-lien-audit.test.js": [
    "lien-audit/SKILL.md",
    "test/fixtures/lien-scenarios.json",
  ],
};

/**
 * Eval tiers: gate (blocks merge) vs periodic (weekly cron).
 */
const EVAL_TIERS = {
  "test/skill-validation.test.js": "gate",
  "test/skill-e2e-office-hours.test.js": "gate",
  "test/skill-e2e-lien-audit.test.js": "gate",
};

/**
 * Get changed files from git diff against base branch.
 */
function getChangedFiles(baseBranch = "main") {
  try {
    const diff = execSync(
      `git diff origin/${baseBranch} --name-only 2>/dev/null || git diff HEAD~1 --name-only 2>/dev/null`,
      { encoding: "utf-8" }
    );
    return diff.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Determine which tests should run based on changed files.
 * If EVALS_ALL=1 env var is set, returns all tests.
 */
function selectTests(options = {}) {
  const { tier, forceAll } = options;

  if (forceAll || process.env.EVALS_ALL === "1") {
    const all = Object.keys(TEST_DEPENDENCIES);
    return tier ? all.filter((t) => EVAL_TIERS[t] === tier) : all;
  }

  const changed = getChangedFiles();
  if (changed.length === 0) return [];

  // Check global touchfiles first
  const globalTriggered = GLOBAL_TOUCHFILES.some((gf) =>
    changed.some((cf) => cf === gf || cf.endsWith(gf))
  );

  if (globalTriggered) {
    const all = Object.keys(TEST_DEPENDENCIES);
    return tier ? all.filter((t) => EVAL_TIERS[t] === tier) : all;
  }

  // Check per-test dependencies
  const selected = [];
  for (const [testFile, deps] of Object.entries(TEST_DEPENDENCIES)) {
    if (tier && EVAL_TIERS[testFile] !== tier) continue;

    const triggered = deps.some((dep) => {
      if (dep.includes("*")) {
        const pattern = dep.replace("*", "");
        return changed.some((cf) => cf.includes(pattern));
      }
      return changed.some((cf) => cf === dep || cf.endsWith(dep));
    });

    if (triggered) selected.push(testFile);
  }

  return selected;
}

/**
 * Print which tests would run (for eval:select script).
 */
function printSelection() {
  const tests = selectTests();
  const changed = getChangedFiles();

  console.log(`Changed files: ${changed.length}`);
  changed.forEach((f) => console.log(`  ${f}`));
  console.log(`\nTests selected: ${tests.length}/${Object.keys(TEST_DEPENDENCIES).length}`);
  tests.forEach((t) => console.log(`  ✅ ${t} (${EVAL_TIERS[t] || "untiered"})`));

  const skipped = Object.keys(TEST_DEPENDENCIES).filter((t) => !tests.includes(t));
  skipped.forEach((t) => console.log(`  ⏭️  ${t} (no changes)`));
}

// CLI entrypoint
if (require.main === module) {
  printSelection();
}

module.exports = { selectTests, getChangedFiles, TEST_DEPENDENCIES, EVAL_TIERS, printSelection };
