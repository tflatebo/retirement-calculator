import { test, expect } from '@playwright/test';

test.describe('One-time inflow and outflow events', () => {
  // Shared parse helper — converts formatted currency strings to numbers
  const parse = s => {
    const str = s.trim().replace(/[$,]/g, '');
    if (str.endsWith('M')) return parseFloat(str) * 1_000_000;
    if (str.endsWith('K')) return parseFloat(str) * 1_000;
    return parseFloat(str);
  };

  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start from default state
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('retirementCalcState'));
    await page.reload();
    await page.waitForSelector('.top-strip', { timeout: 10000 });
    // One-Time Inflows and Outflows panels default to open — no click needed
  });

  test('adding an inflow increases portfolio in the target year', async ({ page }) => {
    // Open Year-over-Year Detail first to get the baseline value
    await page.locator('text=Year-over-Year Detail').click();
    await page.waitForSelector('.year-table tbody tr', { timeout: 5000 });
    // Wait for MC to settle so the mode selector appears
    await page.waitForSelector('#totalModeSelect', { timeout: 30000 });
    await page.locator('#totalModeSelect').selectOption('deterministic');

    // Find the row for age 60 using filter — avoids iterating all rows
    const targetRow = page.locator('.year-table tbody tr').filter({
      has: page.locator(':scope > td:nth-child(2)', { hasText: /^60$/ })
    });
    await expect(targetRow).toBeVisible({ timeout: 5000 });

    // Column order: 0=Year, 1=Age, 2=Phase, 3=Cash, 4=Taxable, 5=Pre-Tax, 6=Roth, 7=Total
    const totalCell = targetRow.locator(':scope > td').nth(7);
    const totalBefore = await totalCell.innerText();

    // Add a $500K inflow at age 60
    // One-Time Inflows panel is open by default — btn-add is in the DOM
    const addInflowBtn = page.locator('button.btn-add').filter({ hasText: '+ Add Inflow' });
    await addInflowBtn.scrollIntoViewIfNeeded();
    await addInflowBtn.click();
    await expect(page.locator('.one-time-inflow-row').last()).toBeVisible();

    // Fill in the new inflow row
    const inflowRows = page.locator('.one-time-inflow-row');
    const lastRow = inflowRows.last();

    const lastAgeInput = lastRow.locator('.phase-field').filter({ has: page.locator('label', { hasText: 'Age' }) }).locator('input[type="number"]');
    await lastAgeInput.fill('60');
    await lastAgeInput.blur();

    const taxableInput = lastRow.locator('.phase-field').filter({ has: page.locator('label', { hasText: 'Taxable' }) }).locator('input[type="number"]');
    await taxableInput.fill('500000');
    await taxableInput.blur();

    // Wait for re-render: total cell text must change from the baseline
    await expect(totalCell).not.toHaveText(totalBefore, { timeout: 2000 });

    const totalAfter = await totalCell.innerText();

    // Portfolio at age 60 should be higher after the $500K inflow
    expect(parse(totalAfter)).toBeGreaterThan(parse(totalBefore));
  });

  test('adding an outflow decreases portfolio in the target year', async ({ page }) => {
    // Open Year-over-Year Detail first to get the baseline value
    await page.locator('text=Year-over-Year Detail').click();
    await page.waitForSelector('.year-table tbody tr', { timeout: 5000 });
    await page.waitForSelector('#totalModeSelect', { timeout: 30000 });
    await page.locator('#totalModeSelect').selectOption('deterministic');

    // Find the row for age 65 using filter
    const targetRow = page.locator('.year-table tbody tr').filter({
      has: page.locator(':scope > td:nth-child(2)', { hasText: /^65$/ })
    });
    await expect(targetRow).toBeVisible({ timeout: 5000 });

    // Column order: 0=Year, 1=Age, 2=Phase, 3=Cash, 4=Taxable, 5=Pre-Tax, 6=Roth, 7=Total
    const totalCell = targetRow.locator(':scope > td').nth(7);
    const totalBefore = await totalCell.innerText();

    // Add a $200K outflow at age 65
    // One-Time Outflows panel is open by default — btn-add is in the DOM
    const addOutflowBtn = page.locator('button.btn-add').filter({ hasText: '+ Add Outflow' });
    await addOutflowBtn.scrollIntoViewIfNeeded();
    await addOutflowBtn.click();
    await expect(page.locator('.one-time-outflow-row').last()).toBeVisible();

    const outflowRows = page.locator('.one-time-outflow-row');
    const lastRow = outflowRows.last();
    const lastAgeInput = lastRow.locator('input[type="number"]').first();
    await lastAgeInput.fill('65');
    await lastAgeInput.blur();

    const amountInput = lastRow.locator('input[type="number"]').nth(1);
    await amountInput.fill('200000');
    await amountInput.blur();

    // Wait for re-render: total cell text must change from the baseline
    await expect(totalCell).not.toHaveText(totalBefore, { timeout: 2000 });

    const totalAfter = await totalCell.innerText();

    // Portfolio at age 65 should be lower after the $200K outflow
    expect(parse(totalAfter)).toBeLessThan(parse(totalBefore));
  });
});
