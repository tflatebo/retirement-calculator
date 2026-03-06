import { test } from '@playwright/test';

test('debug plotArea and domain values', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('retirementCalcState'));
  await page.reload();
  await page.waitForSelector('.top-strip', { timeout: 15000 });
  await page.waitForSelector('[data-testid="drag-handle-retirement"]', { timeout: 5000 });

  // Expose debug values from the DragHandleLayer via a DOM attribute
  // Let's check what ageToSvgX returns for known ages by reading the rect positions
  const info = await page.evaluate(() => {
    const rects = document.querySelectorAll('[data-testid^="drag-handle"]');
    const result = [];
    for (const r of rects) {
      result.push({
        testid: r.dataset.testid,
        x: r.getAttribute('x'),
        y: r.getAttribute('y'),
        width: r.getAttribute('width'),
        height: r.getAttribute('height'),
      });
    }
    // Also check the ReferenceLine for retirement age (red line)
    const svg = document.querySelector('.recharts-wrapper svg');
    const lines = svg?.querySelectorAll('line');
    const refLines = [];
    for (const l of lines || []) {
      const x1 = l.getAttribute('x1');
      const x2 = l.getAttribute('x2');
      const stroke = l.getAttribute('stroke');
      if (x1 === x2 && stroke) {
        refLines.push({ x1, stroke });
      }
    }
    return { rects: result, refLines };
  });
  console.log('Drag handle rects:', JSON.stringify(info.rects, null, 2));
  console.log('Reference lines (vertical):', JSON.stringify(info.refLines, null, 2));
});
