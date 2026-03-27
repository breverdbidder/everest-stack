/**
 * SKILL.md parser and validator for everest-stack.
 * Ported from garrytan/gstack test/helpers/skill-parser.ts
 * Adapted: No $B browser commands to validate, focuses on
 * frontmatter, phase structure, and domain-specific checks.
 */

const fs = require("fs");
const path = require("path");

const REQUIRED_FRONTMATTER = ["name", "version", "description", "allowed-tools"];
const VALID_TOOLS = [
  "Bash", "Read", "Write", "Edit", "Grep", "Glob",
  "AskUserQuestion", "WebSearch", "Agent",
];

/**
 * Parse SKILL.md frontmatter (YAML between --- delimiters).
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { error: "No frontmatter found", fields: {} };

  const yaml = match[1];
  const fields = {};

  // Simple YAML parser for flat + list fields
  let currentKey = null;
  let currentList = null;

  for (const line of yaml.split("\n")) {
    const listMatch = line.match(/^\s+-\s+(.+)/);
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    const multilineMatch = line.match(/^(\w[\w-]*):\s*\|$/);

    if (listMatch && currentKey) {
      if (!currentList) currentList = [];
      currentList.push(listMatch[1].trim());
      fields[currentKey] = currentList;
    } else if (multilineMatch) {
      currentKey = multilineMatch[1];
      currentList = null;
      fields[currentKey] = "";
    } else if (kvMatch) {
      if (currentList) currentList = null;
      currentKey = kvMatch[1];
      fields[currentKey] = kvMatch[2].trim();
    } else if (currentKey && !currentList && line.startsWith("  ")) {
      // Multiline string continuation
      fields[currentKey] += (fields[currentKey] ? "\n" : "") + line.trim();
    }
  }

  return { error: null, fields };
}

/**
 * Validate a SKILL.md file. Returns validation results.
 */
function validateSkill(skillPath) {
  const content = fs.readFileSync(skillPath, "utf-8");
  const { error, fields } = parseFrontmatter(content);
  const warnings = [];
  const errors = [];

  if (error) {
    errors.push(error);
    return { valid: false, errors, warnings, fields };
  }

  // Check required frontmatter
  for (const key of REQUIRED_FRONTMATTER) {
    if (!fields[key]) {
      errors.push(`Missing required frontmatter: ${key}`);
    }
  }

  // Validate tools
  if (fields["allowed-tools"] && Array.isArray(fields["allowed-tools"])) {
    for (const tool of fields["allowed-tools"]) {
      if (!VALID_TOOLS.includes(tool)) {
        warnings.push(`Unknown tool: ${tool}`);
      }
    }
  }

  // Check for phase structure (headings with "Phase")
  const phases = content.match(/^## Phase \d+/gm) || [];
  if (phases.length === 0) {
    warnings.push("No phase structure found (## Phase N headings)");
  }

  // Domain-specific checks
  const body = content.slice(content.indexOf("---", 4) + 3);

  // Check for NEVER-LIE compliance markers
  if (!body.includes("NEVER") && !body.includes("never")) {
    warnings.push("No NEVER-LIE enforcement language found");
  }

  // Check for anti-sycophancy rules
  if (body.includes("Anti-Sycophancy") || body.includes("anti-sycophancy")) {
    // Good — has anti-sycophancy section
  } else if (
    fields.name !== "eval-judge" &&
    fields.name !== "nexus-retro" &&
    !fields.name.startsWith("deal-ship") &&
    fields.version !== "0.1.0" // Skip stubs
  ) {
    warnings.push("No anti-sycophancy rules found");
  }

  // Check for completion status
  if (!body.includes("Completion status") && !body.includes("STUB")) {
    warnings.push("No completion status section found");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fields,
    stats: {
      lines: content.split("\n").length,
      chars: content.length,
      phases: phases.length,
      headings: (content.match(/^#{1,4} /gm) || []).length,
    },
  };
}

/**
 * Validate all skills in the repo.
 */
function validateAllSkills(rootDir) {
  const results = {};
  const dirs = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "test" && d.name !== "docs" && d.name !== "scripts" && d.name !== "node_modules");

  for (const dir of dirs) {
    const skillPath = path.join(rootDir, dir.name, "SKILL.md");
    if (fs.existsSync(skillPath)) {
      results[dir.name] = validateSkill(skillPath);
    }
  }
  return results;
}

module.exports = { parseFrontmatter, validateSkill, validateAllSkills };
