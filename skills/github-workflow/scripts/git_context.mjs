#!/usr/bin/env node
/**
 * Collects Git repository state, skill merge-target config, and GitHub CLI PR
 * context as JSON.
 *
 * Read-only helper script for the github-workflow skill. Never mutates repo or
 * GitHub state.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILL_CONFIG_PATH = path.resolve(__dirname, "..", "config.json");

const DEFAULT_CONFIG = {
  pr_target_branch: "",
  disallowed_target_branches: ["main", "master"],
  protected_push_branches: ["main", "master"],
  allow_pr_merge: false,
};

const SENSITIVE_PATTERNS = [
  /(^|[/\\])\.env($|\.)/i,
  /\.(pem|key|p12|pfx|jks|keystore)$/i,
  /(^|[/\\])(id_rsa|id_ed25519|credentials\.json|secrets?\.(json|ya?ml|toml))$/i,
];

function runCmd(cmd, args, { trim = true } = {}) {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    windowsHide: true,
  });
  if (res.error) {
    return { code: 127, stdout: "", stderr: res.error.message };
  }
  const stdout = res.stdout || "";
  const stderr = res.stderr || "";
  return {
    code: res.status ?? 1,
    stdout: trim ? stdout.trim() : stdout.replace(/[\r\n]+$/, ""),
    stderr: stderr.trim(),
  };
}

function readJsonIfExists(filePath, errors) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    errors.push(`Config file ${filePath} must contain a JSON object.`);
  } catch (err) {
    errors.push(`Failed to parse config file ${filePath}: ${err.message}`);
  }
  return null;
}

function loadWorkflowConfig(repoRoot, errors) {
  const sources = [];
  let merged = { ...DEFAULT_CONFIG };

  const skillCfg = readJsonIfExists(SKILL_CONFIG_PATH, errors);
  if (skillCfg) {
    merged = { ...merged, ...skillCfg };
    sources.push(SKILL_CONFIG_PATH);
  }

  if (repoRoot) {
    const repoCfgPath = path.join(repoRoot, ".github-workflow.json");
    const repoCfg = readJsonIfExists(repoCfgPath, errors);
    if (repoCfg) {
      merged = { ...merged, ...repoCfg };
      sources.push(repoCfgPath);
    }
  }

  // Normalize arrays & strings
  const prTargetBranch =
    typeof merged.pr_target_branch === "string"
      ? merged.pr_target_branch.trim()
      : "";
  const disallowedTargetBranches = Array.isArray(
    merged.disallowed_target_branches
  )
    ? merged.disallowed_target_branches
        .filter((b) => typeof b === "string" && b.trim())
        .map((b) => b.trim())
    : [...DEFAULT_CONFIG.disallowed_target_branches];
  const protectedPushBranches = Array.isArray(merged.protected_push_branches)
    ? merged.protected_push_branches
        .filter((b) => typeof b === "string" && b.trim())
        .map((b) => b.trim())
    : [...DEFAULT_CONFIG.protected_push_branches];

  return {
    sources,
    pr_target_branch: prTargetBranch || null,
    disallowed_target_branches: disallowedTargetBranches,
    protected_push_branches: protectedPushBranches,
    // PR merging is permanently disabled by policy regardless of file value.
    allow_pr_merge: false,
  };
}

function detectDefaultBranch(ghInstalled) {
  let res = runCmd("git", ["symbolic-ref", "refs/remotes/origin/HEAD"]);
  if (res.code === 0 && res.stdout) {
    const parts = res.stdout.split("/");
    return parts[parts.length - 1];
  }

  if (ghInstalled) {
    res = runCmd("gh", [
      "repo",
      "view",
      "--json",
      "defaultBranchRef",
      "-q",
      ".defaultBranchRef.name",
    ]);
    if (res.code === 0 && res.stdout) {
      return res.stdout;
    }
  }

  for (const candidate of ["main", "master"]) {
    res = runCmd("git", [
      "show-ref",
      "--verify",
      "--quiet",
      `refs/heads/${candidate}`,
    ]);
    if (res.code === 0) {
      return candidate;
    }
  }

  return "main";
}

function listAvailableNonDisallowedBranches(disallowedBranches) {
  const disallowedSet = new Set(disallowedBranches);
  const found = new Set();

  const localRes = runCmd("git", [
    "for-each-ref",
    "--format=%(refname:short)",
    "refs/heads/",
  ]);
  if (localRes.code === 0 && localRes.stdout) {
    for (const b of localRes.stdout.split(/\r?\n/)) {
      const name = b.trim();
      if (name && !disallowedSet.has(name)) {
        found.add(name);
      }
    }
  }

  const remoteRes = runCmd("git", [
    "for-each-ref",
    "--format=%(refname:short)",
    "refs/remotes/origin/",
  ]);
  if (remoteRes.code === 0 && remoteRes.stdout) {
    for (const ref of remoteRes.stdout.split(/\r?\n/)) {
      const trimmed = ref.trim();
      if (!trimmed || trimmed === "origin/HEAD" || trimmed === "origin") continue;
      const shortName = trimmed.replace(/^origin\//, "");
      if (shortName && !disallowedSet.has(shortName)) {
        found.add(shortName);
      }
    }
  }

  return Array.from(found).sort();
}

function parseStatus() {
  const res = runCmd("git", ["status", "--porcelain=v1", "-uall"], {
    trim: false,
  });
  const staged = [];
  const unstaged = [];
  const untracked = [];

  if (res.code !== 0 || !res.stdout) {
    return { staged, unstaged, untracked };
  }

  for (const line of res.stdout.split(/\r?\n/)) {
    if (line.length < 4) continue;
    const x = line[0];
    const y = line[1];
    const filePath = line.slice(3);
    if (x === "?" && y === "?") {
      untracked.push(filePath);
    } else {
      if (x !== " ") staged.push(filePath);
      if (y !== " ") unstaged.push(filePath);
    }
  }

  return { staged, unstaged, untracked };
}

function findSensitiveFiles(files) {
  const flagged = new Set();
  for (const filePath of files) {
    if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(filePath))) {
      flagged.add(filePath);
    }
  }
  return Array.from(flagged).sort();
}

function main() {
  const result = {
    is_git_repo: false,
    repo_root: null,
    current_branch: null,
    default_branch: null,
    is_default_branch: false,
    is_protected_push_branch: false,
    workflow_config: null,
    pr_target_branch: null,
    pr_target_branch_disallowed: false,
    available_target_candidates: [],
    has_upstream: false,
    upstream_branch: null,
    remote_origin: null,
    files: { staged: [], unstaged: [], untracked: [] },
    sensitive_file_warnings: [],
    unpushed_commits: [],
    diff_stat: "",
    gh_installed: false,
    gh_authenticated: false,
    open_pr: null,
    warnings: [],
    errors: [],
  };

  const rootRes = runCmd("git", ["rev-parse", "--show-toplevel"]);
  const repoRoot = rootRes.code === 0 ? rootRes.stdout : null;

  const cfg = loadWorkflowConfig(repoRoot, result.errors);
  result.workflow_config = cfg;
  result.pr_target_branch = cfg.pr_target_branch;

  if (
    cfg.pr_target_branch &&
    cfg.disallowed_target_branches.includes(cfg.pr_target_branch)
  ) {
    result.pr_target_branch_disallowed = true;
    result.errors.push(
      `Configured pr_target_branch '${cfg.pr_target_branch}' is listed in disallowed_target_branches.`
    );
  } else if (!cfg.pr_target_branch) {
    result.warnings.push(
      "pr_target_branch is not configured in config.json or .github-workflow.json. Ask the user for the PR merge target branch (never default to a disallowed branch like main/master)."
    );
  }

  if (rootRes.code !== 0) {
    result.errors.push(rootRes.stderr || "Not inside a Git repository.");
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  result.is_git_repo = true;
  result.repo_root = repoRoot;

  const ghVersion = runCmd("gh", ["--version"]);
  result.gh_installed = ghVersion.code === 0;

  let branchRes = runCmd("git", ["branch", "--show-current"]);
  if (branchRes.code === 0 && branchRes.stdout) {
    result.current_branch = branchRes.stdout;
  } else {
    branchRes = runCmd("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
    if (branchRes.code === 0) {
      result.current_branch = branchRes.stdout;
    }
  }

  const defaultBranch = detectDefaultBranch(result.gh_installed);
  result.default_branch = defaultBranch;
  result.is_default_branch = [defaultBranch, "main", "master"].includes(
    result.current_branch
  );
  result.is_protected_push_branch =
    result.is_default_branch ||
    cfg.protected_push_branches.includes(result.current_branch);

  result.available_target_candidates = listAvailableNonDisallowedBranches(
    cfg.disallowed_target_branches
  );

  const remoteRes = runCmd("git", ["remote", "get-url", "origin"]);
  if (remoteRes.code === 0 && remoteRes.stdout) {
    result.remote_origin = remoteRes.stdout;
  }

  const compareBase = cfg.pr_target_branch || defaultBranch;
  const upstreamRes = runCmd("git", [
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{u}",
  ]);
  if (upstreamRes.code === 0 && upstreamRes.stdout) {
    result.has_upstream = true;
    result.upstream_branch = upstreamRes.stdout;
    const logRes = runCmd("git", [
      "log",
      `${upstreamRes.stdout}..HEAD`,
      "--oneline",
    ]);
    if (logRes.code === 0 && logRes.stdout) {
      result.unpushed_commits = logRes.stdout.split(/\r?\n/);
    }
  } else if (result.current_branch && result.current_branch !== "HEAD") {
    const logRes = runCmd("git", [
      "log",
      `${compareBase}..HEAD`,
      "--oneline",
    ]);
    if (logRes.code === 0 && logRes.stdout) {
      result.unpushed_commits = logRes.stdout.split(/\r?\n/);
    }
  }

  const files = parseStatus();
  result.files = files;
  const allFiles = [...files.staged, ...files.unstaged, ...files.untracked];
  result.sensitive_file_warnings = findSensitiveFiles(allFiles);

  const statStaged = runCmd("git", ["diff", "--cached", "--stat"]).stdout;
  const statUnstaged = runCmd("git", ["diff", "--stat"]).stdout;
  result.diff_stat = [statStaged, statUnstaged].filter(Boolean).join("\n");

  if (result.gh_installed) {
    const authRes = runCmd("gh", ["auth", "status"]);
    if (authRes.code === 0) {
      result.gh_authenticated = true;
      if (result.current_branch && result.current_branch !== "HEAD") {
        const prRes = runCmd("gh", [
          "pr",
          "list",
          "--head",
          result.current_branch,
          "--state",
          "open",
          "--json",
          "number,title,url,body,baseRefName,isDraft",
        ]);
        if (prRes.code === 0 && prRes.stdout) {
          try {
            const prs = JSON.parse(prRes.stdout);
            if (Array.isArray(prs) && prs.length > 0) {
              result.open_pr = prs[0];
              if (
                cfg.disallowed_target_branches.includes(
                  result.open_pr.baseRefName
                )
              ) {
                result.warnings.push(
                  `Existing open PR #${result.open_pr.number} targets disallowed branch '${result.open_pr.baseRefName}'. Warn the user before updating.`
                );
              }
            }
          } catch (err) {
            result.errors.push(`Failed to parse gh pr list JSON: ${err.message}`);
          }
        } else if (prRes.stderr) {
          result.errors.push(prRes.stderr);
        }
      }
    } else {
      result.errors.push(
        authRes.stderr || "GitHub CLI is not authenticated. Run `gh auth login`."
      );
    }
  } else {
    result.errors.push("GitHub CLI (`gh`) is not installed or not in PATH.");
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
