import { test, expect } from '@playwright/test';

// .claude/rules/tests.md（**/*.spec.ts に適用）が明記する認可境界のテスト:
// 「閲覧権限のない記録が見えないこと」「本人以外が編集・削除できないこと」。
// backend側のe2eで境界そのものは検証済みだが、ここではフロント経由で実際に
// その境界が守られていることを確認する（notFoundOn404 / 編集ページの
// 所有者チェックなど、フロント側の実装が正しく機能しているかの確認）。

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function registerAndLogin(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  name: string,
) {
  const password = 'password123';
  await request.post(`${BACKEND_URL}/auth/register`, {
    data: { email, password, name },
  });
  const res = await request.post(`${BACKEND_URL}/auth/login`, {
    data: { email, password },
  });
  const { token } = (await res.json()) as { token: string };
  return { email, password, token };
}

test.describe('認可の境界', () => {
  test('閲覧権限のない記録は一覧にも詳細URLにも現れない(404)', async ({
    page,
    request,
  }) => {
    const run = Date.now();
    const owner = await registerAndLogin(
      request,
      `e2e-authz-owner-${run}@example.com`,
      '所有者',
    );
    const outsider = await registerAndLogin(
      request,
      `e2e-authz-outsider-${run}@example.com`,
      '部外者',
    );

    const exerciseRes = await request.post(`${BACKEND_URL}/exercises`, {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: { name: `認可テスト種目-${run}` },
    });
    const exercise = (await exerciseRes.json()) as { id: string };

    // 公開先を指定しない = 自分だけに公開される記録。
    const recordRes = await request.post(`${BACKEND_URL}/records`, {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: {
        exerciseId: exercise.id,
        performedAt: '2026-01-01',
        sets: [{ order: 1, weight: 60, reps: 5 }],
      },
    });
    const record = (await recordRes.json()) as { id: string };

    // 部外者としてログインし、フィードに現れないことを確認する。
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(outsider.email);
    await page.getByLabel('パスワード').fill(outsider.password);
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByText(`認可テスト種目-${run}`)).not.toBeVisible();

    // 直接URLを叩いても閲覧できない(バックエンドの404を素通しする設計)。
    const response = await page.goto(`/records/${record.id}`);
    expect(response?.status()).toBe(404);
  });

  test('グループに公開された記録でも、本人以外は編集ページに入れない', async ({
    page,
    request,
  }) => {
    const run = Date.now();
    const owner = await registerAndLogin(
      request,
      `e2e-authz-owner2-${run}@example.com`,
      '所有者2',
    );
    const member = await registerAndLogin(
      request,
      `e2e-authz-member-${run}@example.com`,
      'メンバー',
    );

    const groupRes = await request.post(`${BACKEND_URL}/groups`, {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: { name: `認可テストグループ-${run}` },
    });
    const { group } = (await groupRes.json()) as {
      group: { id: string; joinCode: string };
    };

    await request.post(`${BACKEND_URL}/groups/join`, {
      headers: { Authorization: `Bearer ${member.token}` },
      data: { joinCode: group.joinCode },
    });

    const exerciseRes = await request.post(`${BACKEND_URL}/exercises`, {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: { name: `認可テスト種目2-${run}` },
    });
    const exercise = (await exerciseRes.json()) as { id: string };

    const recordRes = await request.post(`${BACKEND_URL}/records`, {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: {
        exerciseId: exercise.id,
        performedAt: '2026-01-01',
        sets: [{ order: 1, weight: 70, reps: 5 }],
        visibilityGroupIds: [group.id],
      },
    });
    const record = (await recordRes.json()) as { id: string };

    // グループメンバーとしてログイン。記録は見えるが、編集ボタンは無く、
    // 直接編集URLを叩いても詳細ページへ押し戻される。
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(member.email);
    await page.getByLabel('パスワード').fill(member.password);
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL(/\/feed$/);

    await page.goto(`/records/${record.id}`);
    await expect(page.getByText(`認可テスト種目2-${run}`)).toBeVisible();
    await expect(page.getByRole('link', { name: '編集' })).toHaveCount(0);

    await page.goto(`/records/${record.id}/edit`);
    await page.waitForFunction(
      (id) => location.pathname === `/records/${id}`,
      record.id,
      { timeout: 10000 },
    );
    await expect(page).toHaveURL(`/records/${record.id}`);
  });
});
