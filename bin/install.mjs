#!/usr/bin/env node
/**
 * Zero-dependency CLI installer for AI Skills for Projects.
 *
 * Usage:
 *   npx github:diludfernando/AI_Skills_for_Projects                   # Interactive menu
 *   npx github:diludfernando/AI_Skills_for_Projects <skill-name>      # Install to current project
 *   npx github:diludfernando/AI_Skills_for_Projects <skill> --global  # Install globally
 *   npx github:diludfernando/AI_Skills_for_Projects --list            # List available skills
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_ROOT = path.resolve(REPO_ROOT, "skills");
const ALLOWED_INSTALL_BRANCH = "main";

function assertMainBranchInstall() {
  // 1. If invoked via npx from GitHub (e.g. github:owner/repo#branch), inspect
  //    the enclosing npx temp package.json to reject any non-main ref.
  let dir = path.dirname(REPO_ROOT);
  for (let depth = 0; depth < 3; depth++) {
    const parentPkgPath = path.join(dir, "package.json");
    if (fs.existsSync(parentPkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(parentPkgPath, "utf8"));
        const allDeps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
          ...(pkg.optionalDependencies || {}),
        };
        const spec = allDeps["ai-skills"];
        if (typeof spec === "string") {
          const hashIdx = spec.indexOf("#");
          if (hashIdx !== -1) {
            const ref = spec.slice(hashIdx + 1).trim();
            if (ref && ref !== ALLOWED_INSTALL_BRANCH) {
              console.error(
                `Installation blocked: skills can only be installed from the "${ALLOWED_INSTALL_BRANCH}" branch (requested "#${ref}").`
              );
              console.error(
                `Use: npx github:diludfernando/AI_Skills_for_Projects#${ALLOWED_INSTALL_BRANCH}`
              );
              process.exit(1);
            }
          }
        }
      } catch {
        // Ignore unreadable parent package.json
      }
      break;
    }
    const nextDir = path.dirname(dir);
    if (nextDir === dir) break;
    dir = nextDir;
  }

  // 2. If invoked from a local Git checkout of this repository, require main.
  if (fs.existsSync(path.join(REPO_ROOT, ".git"))) {
    const res = spawnSync("git", ["branch", "--show-current"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      windowsHide: true,
    });
    if (res.status === 0) {
      const currentBranch = (res.stdout || "").trim();
      if (currentBranch && currentBranch !== ALLOWED_INSTALL_BRANCH) {
        console.error(
          `Installation blocked: skills can only be installed from the "${ALLOWED_INSTALL_BRANCH}" branch (current branch: "${currentBranch}").`
        );
        console.error(
          `Switch to "${ALLOWED_INSTALL_BRANCH}" or install with: npx github:diludfernando/AI_Skills_for_Projects#${ALLOWED_INSTALL_BRANCH}`
        );
        process.exit(1);
      }
    }
  }
}

function parseFrontmatterDescription(skillMdPath) {
  try {
    const content = fs.readFileSync(skillMdPath, "utf8");
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return "";
    const lines = match[1].split(/\r?\n/);
    let collecting = false;
    const parts = [];
    for (const line of lines) {
      if (!collecting) {
        const start = line.match(/^description:\s*(.*)$/);
        if (start) {
          const val = start[1].trim();
          if (val === ">" || val === ">-" || val === "|" || val === "|-") {
            collecting = true;
          } else {
            parts.push(val);
            break;
          }
        }
      } else if (/^\s+/.test(line)) {
        parts.push(line.trim());
      } else if (line.trim() === "") {
        continue;
      } else {
        break;
      }
    }
    const cleaned = parts.join(" ").replace(/\s+/g, " ").replace(/^["']|["']$/g, "").trim();
    const firstSentence = cleaned.match(/^[^.!?]+[.!?]/)?.[0] || cleaned;
    return firstSentence.length > 100
      ? `${firstSentence.slice(0, 97)}...`
      : firstSentence;
  } catch {
    return "";
  }
}

function discoverSkills() {
  if (!fs.existsSync(SKILLS_ROOT)) return [];
  const entries = fs.readdirSync(SKILLS_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(SKILLS_ROOT, entry.name);
      const skillMd = path.join(dir, "SKILL.md");
      if (!fs.existsSync(skillMd)) return null;
      return {
        name: entry.name,
        dir,
        hasConfig: fs.existsSync(path.join(dir, "config.json")),
        description: parseFrontmatterDescription(skillMd),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function parseArgs(argv) {
  const opts = {
    skills: [],
    global: false,
    all: false,
    list: false,
    force: false,
    help: false,
    targetDir: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-g" || arg === "--global") {
      opts.global = true;
    } else if (arg === "-a" || arg === "--all") {
      opts.all = true;
    } else if (arg === "-l" || arg === "--list") {
      opts.list = true;
    } else if (arg === "-f" || arg === "--force") {
      opts.force = true;
    } else if (arg === "-h" || arg === "--help") {
      opts.help = true;
    } else if (arg === "--dir" && argv[i + 1]) {
      opts.targetDir = path.resolve(argv[++i]);
    } else if (!arg.startsWith("-")) {
      opts.skills.push(arg);
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  return opts;
}

function printHelp(skills) {
  console.log(`
AI Skills Installer (main branch only)

Usage:
  npx github:diludfernando/AI_Skills_for_Projects#main [skill...] [options]

Options:
  -g, --global       Install globally (~/.gemini/config/skills/)
  -a, --all          Install all available skills
  -l, --list         List all available skills
  -f, --force        Overwrite existing skill folder without prompting
  --dir <path>       Custom destination skills directory
  -h, --help         Show this help message

Available skills:
${skills.map((s) => `  - ${s.name}${s.description ? `  (${s.description})` : ""}`).join("\n")}
`);
}

async function promptInteractive(skills) {
  const rl = readline.createInterface({ input, output });
  try {
    console.log("\nAvailable AI Skills:\n");
    skills.forEach((skill, idx) => {
      console.log(`  ${idx + 1}) ${skill.name}`);
      if (skill.description) {
        console.log(`     ${skill.description}`);
      }
    });
    console.log(`  ${skills.length + 1}) All skills\n`);

    const pickRaw = (
      await rl.question(
        `Select skill number(s) (e.g. 1 or 1,2) [1-${skills.length + 1}]: `
      )
    ).trim();

    if (!pickRaw) {
      console.log("Cancelled.");
      process.exit(0);
    }

    let selected = [];
    const tokens = pickRaw.split(/[,\s]+/).filter(Boolean);
    if (tokens.includes(String(skills.length + 1)) || tokens.includes("all")) {
      selected = skills;
    } else {
      const seen = new Set();
      for (const token of tokens) {
        const num = Number.parseInt(token, 10);
        if (!Number.isInteger(num) || num < 1 || num > skills.length) {
          console.error(`Invalid selection: "${token}"`);
          process.exit(1);
        }
        const skill = skills[num - 1];
        if (!seen.has(skill.name)) {
          seen.add(skill.name);
          selected.push(skill);
        }
      }
    }

    console.log("\nWhere should the skill(s) be installed?");
    console.log("  1) Current project (.agents/skills/)  [Recommended]");
    console.log("  2) Global (~/.gemini/config/skills/)\n");

    const scopeRaw = (await rl.question("Choose [1-2] (default 1): ")).trim();
    const isGlobal = scopeRaw === "2";

    return { selected, isGlobal };
  } finally {
    rl.close();
  }
}

async function confirmOverwrite(destPath) {
  if (!input.isTTY) return false;
  const rl = readline.createInterface({ input, output });
  try {
    const ans = (
      await rl.question(`Skill already exists at ${destPath}. Overwrite? (y/N): `)
    )
      .trim()
      .toLowerCase();
    return ans === "y" || ans === "yes";
  } finally {
    rl.close();
  }
}

async function main() {
  const skills = discoverSkills();
  if (skills.length === 0) {
    console.error("No skills found in repository.");
    process.exit(1);
  }

  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    printHelp(skills);
    return;
  }

  if (opts.list) {
    console.log("Available skills:");
    for (const s of skills) {
      console.log(`- ${s.name}${s.description ? `: ${s.description}` : ""}`);
    }
    return;
  }

  // Enforce main-branch-only installation before installing any skill.
  assertMainBranchInstall();

  let selected = [];
  let isGlobal = opts.global;

  if (opts.all) {
    selected = skills;
  } else if (opts.skills.length > 0) {
    const byName = new Map(skills.map((s) => [s.name, s]));
    for (const name of opts.skills) {
      const found = byName.get(name);
      if (!found) {
        console.error(
          `Skill "${name}" not found. Available skills: ${skills
            .map((s) => s.name)
            .join(", ")}`
        );
        process.exit(1);
      }
      selected.push(found);
    }
  } else {
    if (!input.isTTY) {
      printHelp(skills);
      process.exit(1);
    }
    const res = await promptInteractive(skills);
    selected = res.selected;
    isGlobal = res.isGlobal;
  }

  const destBase = opts.targetDir
    ? opts.targetDir
    : isGlobal
      ? path.join(os.homedir(), ".gemini", "config", "skills")
      : path.join(process.cwd(), ".agents", "skills");

  fs.mkdirSync(destBase, { recursive: true });

  const installed = [];
  for (const skill of selected) {
    const dest = path.join(destBase, skill.name);
    if (fs.existsSync(dest) && !opts.force) {
      const ok = await confirmOverwrite(dest);
      if (!ok) {
        console.log(`Skipped ${skill.name} (already exists; pass --force to overwrite).`);
        continue;
      }
      fs.rmSync(dest, { recursive: true, force: true });
    } else if (fs.existsSync(dest) && opts.force) {
      fs.rmSync(dest, { recursive: true, force: true });
    }

    fs.cpSync(skill.dir, dest, { recursive: true });
    installed.push({ skill, dest });
    console.log(`Installed ${skill.name} -> ${dest}`);
  }

  if (installed.length > 0) {
    console.log("\nDone! Next steps:");
    for (const { skill, dest } of installed) {
      if (skill.hasConfig) {
        console.log(`  - Optional: customize ${path.join(dest, "config.json")}`);
      }
    }
    console.log("  - Start a new chat session in your AI agent to activate the skill(s).");
  }
}

main().catch((err) => {
  console.error(`Install failed: ${err.message}`);
  process.exit(1);
});
