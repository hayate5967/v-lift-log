import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ルートにもpackage-lock.json（husky/lint-staged専用）があり、Turbopackが
  // ワークスペースルートを誤検出するのを防ぐため明示する。
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
