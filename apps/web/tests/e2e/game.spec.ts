import { test, expect, type Page } from '@playwright/test';

const SHOTS = 'test-results/shots';

async function playThroughGame(page: Page, capture?: (name: string) => Promise<void>) {
  let captured = false;
  for (let round = 0; round < 12; round++) {
    if (
      await page
        .getByTestId('results')
        .isVisible()
        .catch(() => false)
    )
      break;

    await expect(page.getByTestId('choice').first()).toBeVisible();
    if (capture && round === 0) await capture('question');

    await page.getByTestId('choice').first().click();
    await expect(page.getByTestId('reveal')).toBeVisible();
    await expect(page.getByTestId('next-button')).toBeVisible();
    if (capture && !captured) {
      await capture('reveal');
      captured = true;
    }
    await page.getByTestId('next-button').click();
  }
}

test('a full game: start, play, see results, share a challenge link', async ({
  page,
}, testInfo) => {
  const shot = async (name: string) => {
    await page.screenshot({
      path: `${SHOTS}/${testInfo.project.name}-${name}.png`,
      fullPage: true,
    });
  };

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /which line came from the film/i })).toBeVisible();
  await shot('start');

  await page.getByTestId('start-button').click();
  await playThroughGame(page, shot);

  await expect(page.getByTestId('results')).toBeVisible();
  await expect(page.getByTestId('final-score')).toBeVisible();
  await shot('results');

  await page.getByTestId('share-button').click();
  await expect(page.getByTestId('share-button')).toHaveText(/copied/i);

  // The share text should carry a replayable challenge link.
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toMatch(/\/play\?c=\d+(,\d+)*/);
});

test('a shared challenge link replays specific rounds', async ({ page }) => {
  // Play once to obtain a real challenge link, then replay it.
  await page.goto('/play');
  await playThroughGame(page);
  await expect(page.getByTestId('results')).toBeVisible();
  await page.getByTestId('share-button').click();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  const match = shared.match(/\/play\?c=[\d,]+/);
  expect(match).not.toBeNull();

  await page.goto(match![0]);
  await expect(page.getByTestId('choice').first()).toBeVisible();
  await expect(page.getByText(/Round 1 \//)).toBeVisible();
});
