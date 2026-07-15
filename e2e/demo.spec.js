import { expect, test } from '@playwright/test';

const shot = (name) => `acceptance/screenshots/${name}.png`;

test('完成纳瓦尔世界探索、深入互动、图谱和第二内容包切换', async ({ page, context }) => {
  const consoleErrors = [];
  const failedResources = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`${message.text()} @ ${JSON.stringify(message.location())}`); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failedResources.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', (request) => failedResources.push(`FAILED ${request.url()} ${request.failure()?.errorText || ''}`));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '让知识拥有 可以行走的世界' })).toBeVisible();
  await page.screenshot({ path: shot('01-content-entry') });

  await page.getByRole('button', { name: '进入「自由与判断之境」 →' }).click();
  await expect(page.locator('canvas[data-testid="world-canvas"]')).toBeVisible();
  await page.screenshot({ path: shot('02-naval-central-plaza') });

  const start = JSON.parse(await page.getByTestId('player-position').textContent());
  await page.keyboard.down('d'); await page.waitForTimeout(1300); await page.keyboard.up('d');
  await page.keyboard.down('w'); await page.waitForTimeout(2500); await page.keyboard.up('w');
  const moved = JSON.parse(await page.getByTestId('player-position').textContent());
  expect(moved[0]).toBeGreaterThan(start[0] + 5);
  expect(moved[2]).toBeLessThan(start[2] - 8);
  await expect(page.getByRole('heading', { name: '财富工坊' })).toBeVisible();
  await page.screenshot({ path: shot('03-third-person-walking') });
  await page.screenshot({ path: shot('04-wealth-zone') });

  await expect.poll(async () => JSON.parse(await page.getByTestId('world-state').textContent()).nearbyId).toBe('specific-knowledge');
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: '专长知识详情' })).toBeVisible();
  await expect(page.getByText('第一部分·第一章「找到天赋所在，积累专长」，PDF第39页起')).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('05-knowledge-detail') });
  await page.getByRole('button', { name: '关闭详情' }).click();

  await page.getByRole('button', { name: /知识图谱/ }).click();
  const knowledgeGraph = page.getByRole('dialog', { name: '知识关系图' });
  await expect(knowledgeGraph).toBeVisible();
  await expect(knowledgeGraph.getByRole('button', { name: /专长/ })).toContainText('专长');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('06-knowledge-graph') });
  await page.getByRole('button', { name: '前往地点 →' }).click();
  await expect(page.getByText('正在前往')).toBeVisible();
  await page.screenshot({ path: shot('07-location-guidance') });

  await page.reload();
  await page.getByRole('button', { name: '进入「自由与判断之境」 →' }).click();
  await expect(page.getByRole('button', { name: /知识图谱 1\/12/ })).toBeVisible();
  const navalStored = JSON.parse(await page.getByTestId('world-state').textContent());
  expect(navalStored.deepened).toContain('specific-knowledge');

  await page.getByRole('button', { name: /书 自由与判断之境/ }).click();
  const storyCard = page.locator('.pack-card').filter({ hasText: '《雾灯镇来信》' });
  await expect(storyCard).toHaveCount(1); await storyCard.click();
  await page.getByRole('button', { name: '进入「雾灯镇」 →' }).click();
  await expect(page.getByRole('button', { name: /人物关系 0\/3/ })).toBeVisible();
  await expect(page.getByText('林遥', { exact: true })).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('08-story-world') });
  await page.getByRole('button', { name: /人物关系/ }).click();
  await expect(page.getByRole('dialog', { name: '人物关系图' })).toBeVisible();
  await expect(page.getByRole('button', { name: /林遥/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /周明/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /无名信/ })).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('09-character-graph') });

  await context.setOffline(true);
  await page.getByRole('button', { name: '关闭关系图' }).click();
  await page.keyboard.press('r');
  await expect(page.locator('canvas[data-testid="world-canvas"]')).toBeVisible();
  await context.setOffline(false);
  await page.goto('/asset-ledger.html');
  await expect(page.getByRole('heading', { name: '书境 Demo 资产授权台账' })).toBeVisible();
  await page.screenshot({ path: shot('10-asset-license-ledger') });
  expect({ consoleErrors, failedResources }).toEqual({ consoleErrors: [], failedResources: [] });
});

test('3D世界达到目标帧率且界面反馈及时', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '进入「自由与判断之境」 →' }).click();
  await expect(page.locator('canvas[data-testid="world-canvas"]')).toBeVisible();
  const frameResult = await page.evaluate(() => new Promise((resolve) => {
    const samples = []; let previous = performance.now();
    const collect = (time) => {
      samples.push(time - previous); previous = time;
      if (samples.length < 180) requestAnimationFrame(collect);
      else {
        const total = samples.reduce((sum, value) => sum + value, 0);
        let lowRun = 0; let longestLowRun = 0;
        for (const value of samples) { lowRun = value > 33.34 ? lowRun + value : 0; longestLowRun = Math.max(longestLowRun, lowRun); }
        resolve({ averageFps: 1000 / (total / samples.length), longestLowRun });
      }
    };
    requestAnimationFrame(collect);
  }));
  expect(frameResult.averageFps).toBeGreaterThanOrEqual(45);
  expect(frameResult.longestLowRun).toBeLessThan(2000);

  const feedbackStart = Date.now();
  await page.getByRole('button', { name: /知识图谱/ }).click();
  await expect(page.getByRole('dialog', { name: '知识关系图' })).toBeVisible();
  expect(Date.now() - feedbackStart).toBeLessThan(500);
  console.log(`PERFORMANCE averageFps=${frameResult.averageFps.toFixed(1)} longestLowRun=${frameResult.longestLowRun.toFixed(1)}ms graphFeedback=${Date.now() - feedbackStart}ms`);
});
