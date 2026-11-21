# Webpage Testing Skill (`webpage-testing`)

An isolated, self-contained AI agent skill for running **live browser functional QA** on webpages (navigation, buttons, forms, broken links) and optionally generating or running **automated Playwright E2E tests**.

## Features

- **Explicit commands only**: Never auto-triggers after coding tasks.
- **Live Browser QA**: Tests real user flows (navigation, buttons, interactive controls, forms, validation, broken links) and produces a structured QA bug report.
- **Playwright E2E Generation & Execution**: Turns verified user flows into resilient Playwright `.spec.ts` tests using accessible locators (`getByRole`, `getByLabel`, `getByTestId`).
- **Production Safety Guard**: Automatically detects production URLs and blocks destructive form submissions unless explicitly approved.
- **Configurable in Code**: Customize default URLs, viewports, enabled checks, and Playwright settings in [`config.json`](./config.json) or per-project `.webpage-testing.json`.

## Folder Structure

```text
webpage-testing/
├── README.md                          # This guide
├── SKILL.md                           # Main skill instructions & trigger rules
├── config.json                        # Default URL, viewports, checks & Playwright config
├── scripts/
│   └── test_context.mjs               # Read-only config, URL safety & Playwright inspector
├── resources/
│   └── qa-report-template.md          # Structured QA report format
└── references/
    └── playwright-patterns.md         # Best-practice Playwright E2E patterns & commands
```

---

## Step-by-Step Installation

### 1. Prerequisites

| Tool | Required For | Quick Install (Windows) | Quick Install (macOS) |
| :--- | :--- | :--- | :--- |
| **Node.js** | Runs `scripts/test_context.mjs` & Playwright | `winget install --id OpenJS.NodeJS.LTS` | `brew install node` |
| **Agent Browser Capability** | Live interactive QA (`test page`, `smoke test`) | Built into Antigravity | Built into Antigravity |
| **Playwright** *(optional)* | Running automated E2E tests (`write e2e`, `run e2e`) | `npm init playwright@latest` (inside your project) | `npm init playwright@latest` |

### 2. Copy the Skill Into Your Agent

Choose **one** installation scope:

#### A. Single Project (`.agents/skills/`)
**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Path "<your-project>\.agents\skills" -Force
Copy-Item -Path ".\skills\webpage-testing" -Destination "<your-project>\.agents\skills\webpage-testing" -Recurse -Force
```

**macOS / Linux:**
```bash
mkdir -p "<your-project>/.agents/skills"
cp -R ./skills/webpage-testing "<your-project>/.agents/skills/"
```

#### B. Global (`~/.gemini/config/skills/`)
**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Path "$env:USERPROFILE\.gemini\config\skills" -Force
Copy-Item -Path ".\skills\webpage-testing" -Destination "$env:USERPROFILE\.gemini\config\skills\webpage-testing" -Recurse -Force
```

**macOS / Linux:**
```bash
mkdir -p ~/.gemini/config/skills
cp -R ./skills/webpage-testing ~/.gemini/config/skills/
```

### 3. Configure Defaults (Optional)

Edit [`config.json`](./config.json) or add `.webpage-testing.json` at any project root to override defaults:

```json
{
  "default_url": "http://localhost:5173",
  "checks": {
    "functional_flows": true,
    "broken_links": true,
    "console_and_network_errors": true,
    "responsive_layout": false,
    "accessibility_basics": false
  },
  "playwright": {
    "test_dir": "tests/e2e",
    "browser": "chromium",
    "headless": true
  }
}
```

### 4. Verify the Installation

Run the helper script from your project directory:

```bash
node .agents/skills/webpage-testing/scripts/test_context.mjs --url http://localhost:3000
```

Then start a **new chat/session** in your AI agent so it discovers the skill.

---

## Usage Examples

| Command | What the Agent Does |
| :--- | :--- |
| `test page http://localhost:3000` | Runs a full functional flow QA pass in the live browser and outputs a structured QA report. |
| `test page` | Tests the `default_url` configured in `config.json` / `.webpage-testing.json`. |
| `smoke test https://staging.example.com` | Runs a fast critical-path sanity check (page load, top navigation, primary CTA). |
| `write e2e http://localhost:3000` | Inspects the page, previews test scenarios, and writes Playwright E2E `.spec.ts` files after your confirmation. |
| `write e2e login flow` | Writes targeted Playwright tests for the specified user flow. |
| `run e2e` | Executes existing Playwright tests and summarizes any failures with root causes. |
