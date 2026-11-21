---
name: webpage-testing
description: >-
  Tests webpages through live browser functional QA (navigation, buttons, forms,
  broken links) and optionally generates or runs automated Playwright E2E tests.
  Use ONLY when the user explicitly triggers a webpage testing command such as
  "test page", "smoke test", "write e2e", or "run e2e", or explicitly asks to
  QA or write E2E tests for a webpage URL. Never auto-trigger after coding, and
  never perform destructive actions or payments on production sites.
---

# Webpage Testing Skill

This skill runs structured **functional QA tests** against live webpages and optionally generates or executes **Playwright E2E tests**. Follow every safety rule strictly.

## Non-Negotiable Safety Rules

1. **Explicit Trigger Only**:
   - Do **not** auto-run webpage tests or generate E2E test files automatically after finishing a coding task unless the user explicitly invokes a command (`test page`, `smoke test`, `write e2e`, `run e2e`).
2. **Protect Production Sites**:
   - Never submit destructive forms (deleting records/accounts, sending real emails/messages, triggering billing/orders, or mutating real user data) when `target.destructive_actions_blocked` is `true` (e.g., production URLs) unless the user explicitly approves that specific action.
3. **Never Bypass Security, CAPTCHAs, or Payments**:
   - Never attempt to solve/bypass CAPTCHAs or anti-bot gates, never enter real payment details, and never hardcode real credentials in `config.json` or generated test files. Pause and ask the user if login or human verification is required.
4. **Confirm Before Writing New Files or Installing Packages**:
   - For `write e2e`, preview the planned test file path(s) and covered scenarios before creating files or installing `@playwright/test`.

---

## Configuration (In Code)

Defaults live in [config.json](./config.json) and can be overridden per repository with `<repo-root>/.webpage-testing.json`:

```json
{
  "default_url": "http://localhost:3000",
  "disallow_destructive_actions_on": ["prod", "production"],
  "viewports": {
    "desktop": { "width": 1440, "height": 900 },
    "mobile": { "width": 390, "height": 844 }
  },
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
  },
  "report_output_dir": "qa-reports"
}
```

---

## Preflight: Inspect Context First

Before running any command, gather configuration, target URL safety status, and Playwright workspace readiness in one step using [test_context.mjs](./scripts/test_context.mjs):

```bash
# Run from the repository root (pass --url if the user gave one):
node skills/webpage-testing/scripts/test_context.mjs --url <target-url>
# (Or if installed inside another project's .agents/skills/ folder:)
# node .agents/skills/webpage-testing/scripts/test_context.mjs --url <target-url>
```

Check from the output:
- `target.valid` is `true`. If no URL was supplied and `default_url` isn't reachable, ask the user for the target URL (or confirm if a local dev server from `workspace.relevant_npm_scripts` should be started first).
- Note `target.destructive_actions_blocked` before interacting with forms.
- Check which flags under `config.checks` are enabled (by default: `functional_flows`, `broken_links`, and passive `console_and_network_errors`).

---

## Core Commands

### 1. `test page [url]`
**Trigger**: User explicitly says `test page` or `test page <url>`.

**Procedure**:
1. Run `test_context.mjs` (passing `--url <url>` if provided).
2. Open the target URL in the browser (use the agent's browser capability/subagent for live page interaction).
3. Execute the **Functional Flow QA Pass**:
   - **Initial Load**: Verify the page renders cleanly with no blank screen, uncaught exceptions, or broken primary assets.
   - **Navigation & Links**: Verify primary nav items, header/footer links, tabs, and anchor links resolve without 404s or broken redirects.
   - **Buttons & Interactive Controls**: Test key buttons, dropdowns, modals, toggles, accordions, search/filter controls, and verify visible state updates match expectations.
   - **Forms & Validation**: Test empty/invalid input validation messages and (when safe / non-production) valid form submission flows.
   - **Console & Failed Requests** (if enabled in `config.checks`): Record any uncaught JS console errors or failed HTTP 4xx/5xx API requests triggered during the flows.
   - **Optional Checks**: Only run `responsive_layout` (desktop + mobile viewports) or `accessibility_basics` if enabled in `config.checks` or explicitly requested by the user.
4. Capture visual evidence (screenshots) for any failing flow or broken UI state.
5. Produce a structured QA report following [qa-report-template.md](./resources/qa-report-template.md) with clear **Pass / Fail / Blocked** verdicts and reproducible steps for every defect.
6. Optionally offer to save the report under `config.report_output_dir` or generate Playwright tests (`write e2e`) for the tested flows.

---

### 2. `smoke test [url]`
**Trigger**: User explicitly says `smoke test` or `smoke test <url>`.

**Procedure**:
1. Run `test_context.mjs`.
2. Open the URL and execute a fast (< 1–2 min) critical-path check:
   - Page loads with HTTP 200 and visible primary content.
   - Top-level navigation links work without 404s.
   - Primary CTA / core user flow works without uncaught console errors.
3. Return a concise **Smoke Test Verdict** (`PASS` or `FAIL`) with bulleted evidence.

---

### 3. `write e2e [url | flow description]`
**Trigger**: User explicitly says `write e2e` (optionally with a URL or flow name, e.g., `write e2e login flow`).

**Procedure**:
1. Run `test_context.mjs` to inspect `workspace.playwright_in_package_json`, `workspace.test_dir`, and `workspace.existing_e2e_files`.
2. Inspect the live page DOM (via browser) and/or relevant frontend source files to discover stable user-facing selectors (`role`, `label`, `placeholder`, `data-testid`).
3. **Preview & Confirm**:
   - Show the target file path (e.g., `tests/e2e/<feature>.spec.ts`), the user flows/assertions to be covered, and note if `@playwright/test` needs to be installed.
   - Wait for user confirmation before writing files or installing dependencies.
4. Author clean, deterministic Playwright tests following [playwright-patterns.md](./references/playwright-patterns.md):
   - Prefer `getByRole`, `getByLabel`, `getByText`, and `getByTestId` over brittle CSS/XPath chains.
   - Use auto-waiting web-first assertions (`await expect(locator).toBeVisible()`); never use arbitrary `waitForTimeout`.
   - Keep each test isolated and independent.
5. **Verify**: Run the newly created test (`npx playwright test <file>`) if Playwright is installed and the target URL is reachable, then report pass/fail results.

---

### 4. `run e2e [file]`
**Trigger**: User explicitly says `run e2e` or `run e2e <test-file>`.

**Procedure**:
1. Run `test_context.mjs` to locate existing test files and Playwright setup.
2. Execute `npx playwright test` (or `npx playwright test <file>` using configured browser/headless options).
3. Summarize passed, failed, and skipped tests. For any failure, report the exact assertion, failing step, and likely root cause (app bug vs. outdated selector).
