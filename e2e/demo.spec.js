import { expect, test } from '@playwright/test';

const screenshotDirectory = process.env.PLAYWRIGHT_BASE_URL
  ? 'test-results/online-screenshots'
  : 'acceptance/screenshots';
const shot = (name) => `${screenshotDirectory}/${name}.png`;
const worldState = async (page) => JSON.parse(await page.getByTestId('world-state').textContent());
const playerPosition = async (page) => JSON.parse(await page.getByTestId('player-position').textContent());

test('完成纳瓦尔世界探索、深入互动、图谱和第二内容包切换', async ({ page, context }) => {
  const consoleErrors = [];
  const failedResources = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`${message.text()} @ ${JSON.stringify(message.location())}`); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failedResources.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', (request) => failedResources.push(`FAILED ${request.url()} ${request.failure()?.errorText || ''}`));

  await page.goto('.');
  await expect(page.getByRole('heading', { name: '让知识拥有 可以行走的世界' })).toBeVisible();
  await page.screenshot({ path: shot('01-content-entry') });

  await page.getByRole('button', { name: '进入「自由与判断之境」 →' }).click();
  await expect(page.getByTestId('phaser-canvas')).toBeVisible();
  await page.screenshot({ path: shot('02-naval-central-plaza') });

  await page.keyboard.down('w');
  await expect.poll(async () => (await playerPosition(page))[2]).toBeLessThan(1000);
  await page.keyboard.up('w');
  await expect.poll(async () => (await worldState(page)).nearbyId).toBe('reading');
  await page.screenshot({ path: shot('03-third-person-walking') });
  await page.keyboard.press('e');
  const detail = page.getByRole('dialog', { name: '阅读知识详情' });
  await expect(detail).toBeVisible();
  await expect(detail.getByRole('heading', { name: '理解它' })).toBeVisible();
  await expect(detail.getByRole('heading', { name: '放进现实' })).toBeVisible();
  await expect(detail.getByRole('heading', { name: '现在可以做什么' })).toBeVisible();
  expect((await detail.textContent()).length).toBeGreaterThan(300);
  await page.screenshot({ path: shot('04-knowledge-detail') });
  await page.getByRole('button', { name: '关闭详情' }).click();

  await page.getByRole('button', { name: /知识图谱/ }).click();
  const knowledgeGraph = page.getByRole('dialog', { name: '知识关系图' });
  await expect(knowledgeGraph).toBeVisible();
  await expect(knowledgeGraph.getByRole('button', { name: /阅读/ })).toContainText('阅读');
  await page.screenshot({ path: shot('05-knowledge-graph') });
  await page.getByRole('button', { name: '前往地点 →' }).click();
  await expect(page.getByText('路线已标记')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: '进入「自由与判断之境」 →' }).click();
  await expect(page.getByRole('button', { name: /知识图谱 \d+\/12/ })).toBeVisible();
  expect((await worldState(page)).deepened).toContain('reading');

  await page.getByRole('button', { name: /书 自由与判断之境/ }).click();
  const storyCard = page.locator('.pack-card').filter({ hasText: '《雾灯镇来信》' });
  await storyCard.click();
  await page.getByRole('button', { name: '进入「雾灯镇」 →' }).click();
  await expect(page.locator('canvas[data-testid="world-canvas"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /人物关系 0\/3/ })).toBeVisible();
  await page.getByRole('button', { name: /人物关系/ }).click();
  await expect(page.getByRole('dialog', { name: '人物关系图' })).toBeVisible();
  await expect(page.getByRole('button', { name: /林遥/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /周明/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /无名信/ })).toBeVisible();

  await context.setOffline(true);
  await page.getByRole('button', { name: '关闭关系图' }).click();
  await page.keyboard.press('r');
  await expect(page.locator('canvas[data-testid="world-canvas"]')).toBeVisible();
  await context.setOffline(false);
  expect({ consoleErrors, failedResources }).toEqual({ consoleErrors: [], failedResources: [] });
});

test('互动世界达到目标帧率且界面反馈及时', async ({ page }) => {
  await page.goto('.');
  await page.getByRole('button', { name: '进入「自由与判断之境」 →' }).click();
  await expect(page.getByTestId('phaser-canvas')).toBeVisible();
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
});

test('人物在四个方向移动时会正确转身并停止', async ({ page }) => {
  await page.goto('.');
  await page.getByRole('button', { name: '进入「自由与判断之境」 →' }).click();
  await expect(page.getByTestId('phaser-canvas')).toBeVisible();
  const start = await playerPosition(page);

  await page.keyboard.down('w');
  await expect.poll(async () => (await worldState(page)).facing).toBe('away');
  await expect.poll(async () => (await worldState(page)).moving).toBe(true);
  await page.waitForTimeout(450);
  await page.keyboard.up('w');
  await expect.poll(async () => (await worldState(page)).moving).toBe(false);
  expect((await playerPosition(page))[2]).toBeLessThan(start[2] - 80);

  for (const [key, facing] of [['s', 'toward'], ['d', 'right'], ['a', 'left']]) {
    await page.keyboard.down(key);
    await expect.poll(async () => (await worldState(page)).facing).toBe(facing);
    await page.keyboard.up(key);
  }
  await page.screenshot({ path: shot('06-directional-player') });
});
