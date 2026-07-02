import { test, expect, type Page } from '@playwright/test';

const SHOTS = 'test-results/shots';

async function playThroughGame(page: Page, capture: (name: string) => Promise<void>) {
  let revealedOnce = false;
  for (let round = 0; round < 12; round++) {
    if (
      await page
        .getByTestId('results')
        .isVisible()
        .catch(() => false)
    )
      break;

    await expect(page.getByTestId('choice').first()).toBeVisible();
    if (round === 0) await capture('question');

    await page.getByTestId('choice').first().click();
    await expect(page.getByTestId('reveal')).toBeVisible();
    await expect(page.getByTestId('next-button')).toBeVisible();
    if (!revealedOnce) {
      await capture('reveal');
      revealedOnce = true;
    }
    await page.getByTestId('next-button').click();
  }
}

test('a full game: start, play ten rounds, see results, share', async ({ page }, testInfo) => {
  const shot = async (name: string) => {
    await page.screenshot({
      path: `${SHOTS}/${testInfo.project.name}-${name}.png`,
      fullPage: true,
    });
  };

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /which line came from the film/i })).toBeVisible();
  // Wait for genre chips to load from the API before capturing.
  await expect(page.getByTestId('genre-filter').getByRole('radio').nth(2)).toBeVisible();
  await shot('start');

  await page.getByTestId('start-button').click();
  await playThroughGame(page, shot);

  await expect(page.getByTestId('results')).toBeVisible();
  await expect(page.getByTestId('final-score')).toBeVisible();
  await shot('results');

  await page.getByTestId('share-button').click();
  await expect(page.getByTestId('share-button')).toHaveText(/copied/i);
});

test('filters carry into a game', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('decade-filter').getByRole('radio').nth(1).click();
  await page.getByTestId('start-button').click();
  await expect(page).toHaveURL(/decade=/);
  await expect(page.getByTestId('choice').first()).toBeVisible();
});
