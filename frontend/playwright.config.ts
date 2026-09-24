import { defineConfig, devices } from '@playwright/test';

// backendは常に3000固定（README/.env.exampleの規約）。frontendはローカル開発時
// backendが先に3000を取るため通常3001になる。ここでも3001に固定し、
// reuseExistingServer（後述）でローカルの既存devサーバーをそのまま使えるようにする。
const FRONTEND_PORT = 3001;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const BACKEND_URL = 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // CIでは backend/frontend とも未起動のため、ここで両方立ち上げる。
  // ローカルでは npm run start:dev / npm run dev を既に起動している前提が多いため、
  // reuseExistingServer(!CI)でその既存プロセスをそのまま使う（二重起動を避ける）。
  webServer: [
    {
      command: 'npm run start:prod',
      cwd: '../backend',
      // AppController(scaffold既定)のGET /は認証不要で200を返すため起動確認に使う。
      url: BACKEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm run start -- --port ${FRONTEND_PORT}`,
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
