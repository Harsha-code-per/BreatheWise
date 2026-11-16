import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { makeAir } from '../tests/fixtures';

/** Serves API responses from fixtures so the browser journey is deterministic and offline. */
async function stubApi(page: Page): Promise<void> {
  const air = makeAir();
  await page.route('**/api/places', (route) =>
    route.fulfill({ json: { places: [{ name: 'Delhi, India', lat: 28.61, lon: 77.21 }] } }),
  );
  await page.route('**/api/air', (route) => route.fulfill({ json: air }));
  await page.route('**/api/plan', (route) =>
    route.fulfill({
      json: {
        source: 'ai',
        briefing: {
          headline: 'Smog until noon, then a clear window',
          summary: 'Stay in until 12:00.',
          explanations: [],
        },
      },
    }),
  );
  await page.route('**/api/ask', (route) =>
    route.fulfill({ json: { answer: 'Open the windows at 12:00 for ten minutes.', source: 'ai' } }),
  );
}

/** Collects console errors, which include any Content-Security-Policy violation. */
function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.map(
      (violation) => `${violation.id}: ${violation.nodes[0]?.target.join(' ') ?? ''}`,
    ),
  ).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test('landing page tells the story under the strict CSP', async ({ page }) => {
      const errors = watchConsole(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: 'Clear the air.' })).toBeVisible();
      const beat = page.getByRole('heading', { name: 'Clean the room you sleep in.' });
      await beat.scrollIntoViewIfNeeded();
      await expect(beat).toBeInViewport();
      await expectAccessible(page);
      expect(errors).toEqual([]);
    });

    test('a family sets up and gets its plan', async ({ page }) => {
      const errors = watchConsole(page);
      await stubApi(page);
      await page.goto('/');
      await page.getByRole('link', { name: 'Check my air' }).first().click();
      await page.getByLabel('City or town').fill('Delhi');
      await page.getByRole('button', { name: 'Search' }).click();
      await page.getByRole('radio', { name: 'Delhi, India' }).check();
      await page.getByRole('button', { name: 'Add a family member' }).click();
      await page.getByLabel('Name').nth(1).fill('Mira');
      await page.getByRole('button', { name: 'Show my plan' }).click();
      await expect(page.getByRole('heading', { name: 'Air in Delhi now' })).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Smog until noon, then a clear window' }),
      ).toBeVisible();
      await expectAccessible(page);
      await page.getByRole('tab', { name: 'Ask' }).click();
      await page.getByLabel('Your question').fill('When should I open the windows?');
      await page.getByRole('button', { name: 'Ask', exact: true }).click();
      await expect(page.getByRole('log')).toContainText('Open the windows at 12:00');
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Air in Delhi now' })).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}

test('the setup form can be completed with the keyboard alone', async ({ page }) => {
  await stubApi(page);
  await page.goto('/app');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await skip.focus();
  await expect(skip).toBeInViewport();
  await page.getByLabel('City or town').focus();
  await page.keyboard.type('Delhi');
  await page.keyboard.press('Enter');
  await page.getByRole('radio', { name: 'Delhi, India' }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Show my plan' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('tab', { name: 'Today' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'At home' })).toHaveAttribute('aria-selected', 'true');
});
