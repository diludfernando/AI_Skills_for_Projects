# Webpage QA Test Report Template

Use this structure when reporting results from `test page` or `smoke test`.

```markdown
# QA Test Report — <Page Name / Feature>

- **Target URL**: `<url>`
- **Environment**: `local` | `staging` | `production`
- **Date**: `YYYY-MM-DD`
- **Overall Verdict**: `PASS` | `FAIL` | `PARTIAL (Blocked)`

## Summary
- **Flows Tested**: `<count>`
- **Passed**: `<count>`
- **Failed**: `<count>`
- **Blocked**: `<count>`
- **Console / Network Errors**: `<count>`

## Functional Flow Results

| # | Flow / Scenario | Status | Notes |
| :- | :--- | :--- | :--- |
| 1 | Initial page load & primary render | PASS / FAIL | ... |
| 2 | Primary navigation & links | PASS / FAIL | ... |
| 3 | Buttons & interactive controls | PASS / FAIL | ... |
| 4 | Form validation & submission | PASS / FAIL / SKIPPED | ... |

## Bugs & Defects Found
<!-- Omit if none found -->

### Bug 1: <Short descriptive title>
- **Severity**: `Critical` | `High` | `Medium` | `Low`
- **Steps to Reproduce**:
  1. Navigate to `<url>`
  2. Click / enter ...
- **Expected Result**: ...
- **Actual Result**: ...
- **Evidence**: Console error / HTTP status / screenshot path (if captured)

## Broken Links & Failed Requests
<!-- List any 4xx/5xx links or API calls observed; write "None observed." if clean -->
- None observed.

## Next Steps
- Suggested fixes or offer to generate automated Playwright tests (`write e2e`) for verified flows.
```
