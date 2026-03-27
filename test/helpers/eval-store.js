/**
 * Eval store — persists eval runs and enables comparison.
 * Ported from garrytan/gstack test/helpers/eval-store.ts
 * Adapted: Node.js, simplified for everest-stack domain evals.
 *
 * Stores runs to ~/.everest-stack/evals/ as JSON files.
 * Each run captures: skill tested, scores, timestamp, git sha.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const EVAL_DIR = path.join(
  process.env.HOME || "/home/claude",
  ".everest-stack",
  "evals"
);

function ensureDir() {
  fs.mkdirSync(EVAL_DIR, { recursive: true });
}

function getGitSha() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function getGitBranch() {
  try {
    return execSync("git branch --show-current", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * Save an eval run result.
 * Returns the filename for later comparison.
 */
function saveRun(skillName, results) {
  ensureDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sha = getGitSha();
  const filename = `${skillName}-${timestamp}-${sha}.json`;
  const filepath = path.join(EVAL_DIR, filename);

  const run = {
    skill: skillName,
    timestamp: new Date().toISOString(),
    git_sha: sha,
    git_branch: getGitBranch(),
    results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.pass).length,
      failed: results.filter((r) => !r.pass).length,
      pass_rate:
        results.length > 0
          ? (
              (results.filter((r) => r.pass).length / results.length) *
              100
            ).toFixed(1) + "%"
          : "0%",
    },
  };

  fs.writeFileSync(filepath, JSON.stringify(run, null, 2));
  return { filepath, run };
}

/**
 * Load the most recent eval run for a skill.
 */
function loadLatestRun(skillName) {
  ensureDir();
  const files = fs
    .readdirSync(EVAL_DIR)
    .filter((f) => f.startsWith(skillName + "-") && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  const filepath = path.join(EVAL_DIR, files[0]);
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

/**
 * Compare two eval runs. Returns diff summary.
 */
function compareRuns(runA, runB) {
  if (!runA || !runB) return { error: "Need two runs to compare" };

  const passedA = runA.summary.passed;
  const passedB = runB.summary.passed;
  const delta = passedB - passedA;

  const regressions = [];
  const improvements = [];

  for (const resultB of runB.results) {
    const resultA = runA.results.find((r) => r.id === resultB.id);
    if (!resultA) continue;
    if (resultA.pass && !resultB.pass) regressions.push(resultB.id);
    if (!resultA.pass && resultB.pass) improvements.push(resultB.id);
  }

  return {
    run_a: { sha: runA.git_sha, timestamp: runA.timestamp, passed: passedA },
    run_b: { sha: runB.git_sha, timestamp: runB.timestamp, passed: passedB },
    delta,
    regressions,
    improvements,
    verdict:
      regressions.length > 0
        ? "REGRESSION"
        : delta > 0
        ? "IMPROVED"
        : "STABLE",
  };
}

/**
 * List all eval runs, optionally filtered by skill.
 */
function listRuns(skillName) {
  ensureDir();
  const files = fs
    .readdirSync(EVAL_DIR)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => !skillName || f.startsWith(skillName + "-"))
    .sort()
    .reverse();

  return files.map((f) => {
    const run = JSON.parse(
      fs.readFileSync(path.join(EVAL_DIR, f), "utf-8")
    );
    return {
      file: f,
      skill: run.skill,
      timestamp: run.timestamp,
      sha: run.git_sha,
      passed: run.summary.passed,
      total: run.summary.total,
      pass_rate: run.summary.pass_rate,
    };
  });
}

module.exports = { saveRun, loadLatestRun, compareRuns, listRuns };
