# Playwright E2E Authoring Patterns

Follow these best practices when generating or updating Playwright tests via `write e2e`.

## 1. Locator Priority (Most Resilient First)

1. `page.getByRole('button', { name: 'Submit' })`
2. `page.getByLabel('Email address')`
3. `page.getByPlaceholder('Search...')`
4. `page.getByText('Welcome back')`
5. `page.getByTestId('checkout-cta')`
6. Avoid brittle deep CSS paths (`div > div:nth-child(3) > span`) or dynamic utility classes.

## 2. Web-First Auto-Waiting Assertions

Always use Playwright's async `expect` matchers instead of manual sleeps:

```ts
import { test, expect } from '@playwright/test';

test('submits contact form and shows confirmation', async ({ page }) => {
  await page.goto('/contact');

  await page.getByLabel('Name').fill('Test User');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByRole('button', { name: 'Send Message' }).click();

  await expect(page.getByRole('status')).toContainText('Message sent');
});
```

- **Never** use `await page.waitForTimeout(3000)` to wait for UI transitions or network calls.
- Wait on visible UI states (`toBeVisible`, `toHaveURL`, `toContainText`) or specific responses (`page.waitForResponse(...)`).

## 3. Passive Console & Page Error Guard

Catch hidden JavaScript runtime crashes during functional flows:

```ts
test('loads home page without uncaught errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
```

## 4. Broken Link Check Pattern

```ts
test('navigation links return healthy status codes', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page.locator('nav a[href]').evaluateAll((els) =>
    els
      .map((el) => (el as HTMLAnchorElement).href)
      .filter((href) => href.startsWith('http'))
  );

  for (const href of new Set(hrefs)) {
    const response = await request.get(href);
    expect(response.status(), `Broken link: ${href}`).toBeLessThan(400);
  }
});
```

## 5. Useful Playwright CLI Commands

```bash
# Install Playwright in a Node project (only after user confirmation)
npm init playwright@latest

# Run all E2E tests headless
npx playwright test

# Run a single test file
npx playwright test tests/e2e/home.spec.ts

# Run headed (visible browser) for debugging
npx playwright test --headed

# Open HTML test report
npx playwright show-report
```
