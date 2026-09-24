import { test, expect } from '@playwright/test';

// AGENTS.mdが名指しする主要フロー: ログイン→記録→フィード
// （ここでは登録→ログアウト→ログイン→記録作成→フィード表示、まで一続きで確認する）

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

test('登録→ログイン→記録作成→フィード表示のメインフロー', async ({
  page,
  request,
}) => {
  const run = Date.now();
  const email = `e2e-mainflow-${run}@example.com`;
  const password = 'password123';
  const name = 'テスト太郎';
  const exerciseName = `E2Eメインフロー種目-${run}`;

  // --- 登録 ---
  await page.goto('/register');
  await page.getByLabel('名前').fill(name);
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード（8文字以上）').fill(password);
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  // --- ログアウト→ログイン（ログインフローも通しで確認する） ---
  await page.getByRole('button', { name: 'ログアウト' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page).toHaveURL(/\/feed$/);

  // --- 記録作成に使う種目を用意する ---
  // 種目登録は本アプリにUI画面が無い（design.md上は記録作成フォームからの
  // 選択のみ）ため、backendへ直接APIで作成する。
  const loginRes = await request.post(`${BACKEND_URL}/auth/login`, {
    data: { email, password },
  });
  const { token } = (await loginRes.json()) as { token: string };
  const exerciseRes = await request.post(`${BACKEND_URL}/exercises`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: exerciseName },
  });
  expect(exerciseRes.ok()).toBeTruthy();

  // --- 記録を手入力で作成 ---
  await page.getByRole('link', { name: '記録' }).click();
  await expect(page).toHaveURL(/\/records$/);
  await page.getByRole('link', { name: '+ 記録を追加' }).click();
  await expect(page).toHaveURL(/\/records\/new$/);

  await page.selectOption('select[name="exerciseId"]', { label: exerciseName });
  await page.fill('input[name="performedAt"]', '2026-01-01');
  const firstSetRow = page.locator('div.flex.items-end.gap-2').first();
  await firstSetRow.locator('input').nth(0).fill('60');
  await firstSetRow.locator('input').nth(1).fill('10');
  await page.locator('main button[type="submit"]').click();
  await expect(page).toHaveURL(/\/records$/);
  await expect(page.getByText(exerciseName)).toBeVisible();

  // --- フィードにも表示されることを確認 ---
  await page.getByRole('link', { name: 'フィード' }).click();
  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByText(exerciseName)).toBeVisible();
});
