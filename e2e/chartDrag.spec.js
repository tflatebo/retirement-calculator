import { test, expect } from '@playwright/test';

test.describe('Chart drag handles', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start from default state
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('retirementCalcState'));
    await page.reload();
    // Wait for MC simulation to finish so chart renders
    await page.waitForSelector('.top-strip', { timeout: 15000 });
    await page.waitForSelector('[data-testid="main-chart-container"]', { timeout: 5000 });
  });

  test('retirement age drag handle exists and is positioned', async ({ page }) => {
    const handle = page.locator('[data-testid="drag-handle-retirement"]');
    await expect(handle).toBeVisible();
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(100);
  });

  test('dragging retirement handle right increases retirement age', async ({ page }) => {
    // Read current retirement age from the Retire label on the chart
    const retireLabel = page.locator('text=/Retire \\d+/').first();
    const textBefore = await retireLabel.textContent();
    const ageBefore = parseInt(textBefore.replace('Retire ', ''));

    // Drag the handle right using dispatchEvent for reliable SVG pointer events
    const handle = page.locator('[data-testid="drag-handle-retirement"]');
    const box = await handle.boundingBox();
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const dragDistance = 80;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Move in small increments for pointer capture to work
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(startX + (dragDistance * i / 10), startY);
    }
    await page.mouse.up();

    // Wait for re-render
    await page.waitForTimeout(500);

    const textAfter = await page.locator('text=/Retire \\d+/').first().textContent();
    const ageAfter = parseInt(textAfter.replace('Retire ', ''));

    expect(ageAfter).toBeGreaterThan(ageBefore);
  });

  test('dragging retirement handle updates first spending phase startAge', async ({ page }) => {
    // Open the Spending Phases panel (use .panel-title to avoid matching chart subtitle)
    await page.locator('.panel-title', { hasText: 'Spending Phases' }).click();
    await page.waitForTimeout(200);

    // Find the first spending phase's Start Age input (value = 55 by default)
    const allInputs = await page.locator('input[type="number"]').all();
    let startAgeInput = null;
    for (const input of allInputs) {
      const val = await input.inputValue();
      if (val === '55') { startAgeInput = input; break; }
    }
    expect(startAgeInput).not.toBeNull();
    const valueBefore = parseInt(await startAgeInput.inputValue());

    // Drag retirement handle right
    const handle = page.locator('[data-testid="drag-handle-retirement"]');
    const box = await handle.boundingBox();
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const dragDistance = 80;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(startX + (dragDistance * i / 10), startY);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);

    const valueAfter = parseInt(await startAgeInput.inputValue());
    expect(valueAfter).toBeGreaterThan(valueBefore);
  });

  test('dragging phase boundary updates adjacent phase edges', async ({ page }) => {
    // Open spending phases panel
    await page.locator('.panel-title', { hasText: 'Spending Phases' }).click();
    await page.waitForTimeout(200);

    // Default phases: [55-64], [65-74], [75-90]
    const handle = page.locator('[data-testid="drag-handle-phase-0-end"]');
    await expect(handle).toBeVisible();
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();

    // Find inputs with value "64" (phase 0 endAge) and "65" (phase 1 startAge)
    const allInputs = await page.locator('input[type="number"]').all();
    let phase0EndInput = null;
    let phase1StartInput = null;
    for (const input of allInputs) {
      const val = await input.inputValue();
      if (val === '64' && !phase0EndInput) phase0EndInput = input;
      if (val === '65' && !phase1StartInput) phase1StartInput = input;
    }
    expect(phase0EndInput).not.toBeNull();
    expect(phase1StartInput).not.toBeNull();

    const endBefore = parseInt(await phase0EndInput.inputValue());
    const startBefore = parseInt(await phase1StartInput.inputValue());
    expect(startBefore - endBefore).toBe(1);

    // Drag right
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const dragDistance = 80;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(startX + (dragDistance * i / 10), startY);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);

    const endAfter = parseInt(await phase0EndInput.inputValue());
    const startAfter = parseInt(await phase1StartInput.inputValue());

    expect(endAfter).toBeGreaterThan(endBefore);
    expect(startAfter).toBeGreaterThan(startBefore);
    expect(startAfter - endAfter).toBe(1);
  });

  test('retirement handle is clamped at minimum age', async ({ page }) => {
    // Default person1Age = 42, so min retirementAge = 43
    const handle = page.locator('[data-testid="drag-handle-retirement"]');
    const box = await handle.boundingBox();

    // Drag far to the left
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(startX - (600 * i / 10), startY);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);

    const text = await page.locator('text=/Retire \\d+/').first().textContent();
    const age = parseInt(text.replace('Retire ', ''));
    expect(age).toBeGreaterThanOrEqual(43);
  });
});
