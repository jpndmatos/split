import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
let currentPage;
try {
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    currentPage = page;
    const failures = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.goto(process.env.SPLIT_URL || 'http://127.0.0.1:3001/');
    await expect(page.getByRole('button', { name: 'Add expense', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('button', { name: 'Add expense', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Amount (â‚¬)', { exact: true }).fill('10.01');
    const preview = page.getByRole('status', { name: 'Share preview' });
    await expect(preview).toContainText('â‚¬2.51');
    expect(await preview.getByText('â‚¬2.50', { exact: true }).count()).toBe(3);
    if (width >= 1000)
      await expect(dialog.getByRole('button', { name: 'Add expense', exact: true })).toBeInViewport(
        { ratio: 1 },
      );
    await dialog.getByLabel('Sofia', { exact: true }).uncheck();
    await expect(preview).toContainText('â‚¬3.33');
    expect(await preview.getByText('â‚¬3.34', { exact: true }).count()).toBe(2);
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      axe.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
    expect(failures).toEqual([]);
    console.log(
      `PASS Split ${width}Ã—${height}: real API, exact share preview, dialog and accessibility.`,
    );
    await context.close();
  }
} catch (error) {
  await mkdir('test-results', { recursive: true });
  await currentPage?.screenshot({ path: 'test-results/workspace.png' });
  throw error;
} finally {
  await browser.close();
}
