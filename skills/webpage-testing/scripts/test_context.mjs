#!/usr/bin/env node
/**
 * Collects webpage-testing skill configuration, target URL safety metadata,
 * and Playwright / local dev server readiness as JSON.
 *
 * Read-only helper script for the webpage-testing skill. Never mutates files
 * or runs tests.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILL_CONFIG_PATH = path.resolve(__dirname, "..", "config.json");

const DEFAULT_CONFIG = {
  default_url: "http://localhost:3000",
  disallow_destructive_actions_on: ["prod", "production"],
  viewports: {
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844 },
  },
  checks: {
    functional_flows: true,
    broken_links: true,
    console_and_network_errors: true,
    responsive_layout: false,
    accessibility_basics: false,
  },
  playwright: {
    test_dir: "tests/e2e",
    browser: "chromium",
    headless: true,
  },
  report_output_dir: "qa-reports",
};

function parseArgs(argv) {
  const args = { url: null, cwd: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--url" && argv[i + 1]) {
      args.url = argv[++i];
    } else if (token.startsWith("--url=")) {
      args.url = token.slice("--url=".length);
    } else if (token === "--cwd" && argv[i + 1]) {
      args.cwd = path.resolve(argv[++i]);
    }
  }
  return args;
}

function readJsonIfExists(filePath, errors) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    errors.push(`Config file ${filePath} must contain a JSON object.`);
  } catch (err) {
    errors.push(`Failed to parse ${filePath}: ${err.message}`);
  }
  return null;
}

function deepMergeConfig(base, override) {
  if (!override) return base;
  return {
    ...base,
    ...override,
    viewports: {
      ...(base.viewports || {}),
      ...(override.viewports || {}),
    },
    checks: {
      ...(base.checks || {}),
      ...(override.checks || {}),
    },
    playwright: {
      ...(base.playwright || {}),
      ...(override.playwright || {}),
    },
  };
}

function classifyUrl(rawUrl, disallowPatterns) {
  if (!rawUrl) {
    return {
      url: null,
      valid: false,
      environment: "unknown",
      destructive_actions_blocked: true,
      note: "No target URL provided or configured.",
    };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      url: rawUrl,
      valid: false,
      environment: "invalid",
      destructive_actions_blocked: true,
      note: `Invalid URL '${rawUrl}'. Include scheme such as http:// or https://.`,
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local");
  const isStaging =
    host.includes("staging") ||
    host.includes("stage") ||
    host.includes("dev.") ||
    host.includes("preview") ||
    host.includes("test.");

  let environment = "production";
  if (isLocal) environment = "local";
  else if (isStaging) environment = "staging";

  const patterns = (disallowPatterns || []).map((p) => String(p).toLowerCase());
  const matchesDisallow =
    patterns.includes(environment) ||
    (environment === "production" && patterns.includes("prod")) ||
    patterns.some((p) => p && host.includes(p));

  return {
    url: parsed.toString(),
    valid: true,
    hostname: host,
    environment,
    destructive_actions_blocked: matchesDisallow,
    note: matchesDisallow
      ? "Destructive form submissions (delete, payment, real account mutations) are blocked on this target unless explicitly confirmed."
      : "Safe environment for interactive functional testing.",
  };
}

function inspectWorkspace(cwd, testDir, errors) {
  const pkgPath = path.join(cwd, "package.json");
  const pkg = readJsonIfExists(pkgPath, errors);

  const deps = {
    ...(pkg?.dependencies || {}),
    ...(pkg?.devDependencies || {}),
  };
  const scripts = pkg?.scripts || {};

  const playwrightInstalled = Boolean(deps["@playwright/test"] || deps["playwright"]);
  const hasPlaywrightConfig = [
    "playwright.config.ts",
    "playwright.config.js",
    "playwright.config.mjs",
  ].some((name) => fs.existsSync(path.join(cwd, name)));

  const devScripts = Object.entries(scripts)
    .filter(([key]) =>
      ["dev", "start", "preview", "serve", "test:e2e", "e2e"].includes(key)
    )
    .reduce((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {});

  const resolvedTestDir = path.join(cwd, testDir || "tests/e2e");
  let existingE2EFiles = [];
  if (fs.existsSync(resolvedTestDir)) {
    try {
      existingE2EFiles = fs
        .readdirSync(resolvedTestDir)
        .filter((f) => /\.(spec|test)\.(ts|js|mjs)$/i.test(f))
        .map((f) => path.join(testDir || "tests/e2e", f).replace(/\\/g, "/"))
        .sort();
    } catch (err) {
      errors.push(`Could not read test directory ${resolvedTestDir}: ${err.message}`);
    }
  }

  return {
    cwd,
    has_package_json: Boolean(pkg),
    playwright_in_package_json: playwrightInstalled,
    has_playwright_config: hasPlaywrightConfig,
    relevant_npm_scripts: devScripts,
    test_dir: testDir || "tests/e2e",
    existing_e2e_files: existingE2EFiles,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const errors = [];
  const sources = [];

  let config = { ...DEFAULT_CONFIG };
  const skillCfg = readJsonIfExists(SKILL_CONFIG_PATH, errors);
  if (skillCfg) {
    config = deepMergeConfig(config, skillCfg);
    sources.push(SKILL_CONFIG_PATH);
  }

  const projectCfgPath = path.join(args.cwd, ".webpage-testing.json");
  const projectCfg = readJsonIfExists(projectCfgPath, errors);
  if (projectCfg) {
    config = deepMergeConfig(config, projectCfg);
    sources.push(projectCfgPath);
  }

  const effectiveUrl = args.url || config.default_url || null;
  const target = classifyUrl(
    effectiveUrl,
    config.disallow_destructive_actions_on
  );
  const workspace = inspectWorkspace(
    args.cwd,
    config.playwright?.test_dir,
    errors
  );

  const result = {
    config_sources: sources,
    config,
    target,
    workspace,
    errors,
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
