import { expect, test } from '@playwright/test';

test('知识节点属于真实世界坐标，玩家必须走近后互动', async ({ page }) => {
  await page.goto('.');
  await page.getByRole('button', { name: '进入「自由与判断之境」 →' }).click();
  await expect(page.getByTestId('phaser-world')).toBeVisible();
  await expect(page.getByTestId('phaser-canvas')).toBeVisible();

  const start = JSON.parse(await page.getByTestId('player-position').textContent());
  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  const moving = JSON.parse(await page.getByTestId('player-position').textContent());
  expect(moving[2]).toBeLessThan(start[2] - 70);
  await page.keyboard.up('w');

  await page.keyboard.down('s');
  await page.waitForTimeout(250);
  await page.keyboard.up('s');
  await expect(page.getByTestId('world-state')).toContainText('"facing":"toward"');

  await page.keyboard.down('w');
  await page.waitForTimeout(2350);
  await page.keyboard.up('w');
  await expect.poll(async () => JSON.parse(await page.getByTestId('world-state').textContent()).nearbyId).toBe('reading');
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: '阅读知识详情' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '理解它' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '放进现实' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '现在可以做什么' })).toBeVisible();
});

test('手机端提供方向和互动控制', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('.');
  await page.getByRole('button', { name: '进入「自由与判断之境」 →' }).click();
  await expect(page.getByRole('button', { name: '向前走' })).toBeVisible();
  await expect(page.getByRole('button', { name: '互动' })).toBeVisible();
});

test('走完三个地点后形成章节完成闭环', async ({ page }) => {
  await page.goto('.');
  await page.getByRole('button', { name: '进入「自由与判断之境」 →' }).click();
  await expect(page.getByTestId('phaser-canvas')).toBeVisible();

  await page.keyboard.down('w');
  await expect.poll(async () => JSON.parse(await page.getByTestId('player-position').textContent())[2]).toBeLessThan(1000);
  await page.keyboard.up('w');
  await expect.poll(async () => JSON.parse(await page.getByTestId('world-state').textContent()).nearbyId).toBe('reading');
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: '阅读知识详情' })).toBeVisible();
  await page.getByRole('button', { name: '关闭详情' }).click();

  await page.keyboard.down('d');
  await expect.poll(async () => JSON.parse(await page.getByTestId('world-state').textContent()).nearbyId).toBe('specific-knowledge');
  await page.keyboard.up('d');
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: '专长知识详情' })).toBeVisible();
  await page.getByRole('button', { name: '关闭详情' }).click();

  await page.keyboard.down('a');
  await expect.poll(async () => JSON.parse(await page.getByTestId('world-state').textContent()).nearbyId).toBe('desire');
  await page.keyboard.up('a');
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: '欲望知识详情' })).toBeVisible();
  await page.getByRole('button', { name: '关闭详情' }).click();

  const completion = page.getByRole('dialog', { name: '章节学习完成' });
  await expect(completion).toBeVisible();
  await expect(completion).toContainText('第一章：判断与自由');
  await expect(completion).toContainText('阅读');
  await expect(completion).toContainText('专长');
  await expect(completion).toContainText('欲望');
});
