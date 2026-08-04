# v-lift-log

@AGENTS.md

## 仕様書の参照方法
プロジェクトの詳細仕様は `docs/design.md` にある（アプリ設計・API・DB・デバイス・開発プロセス）。
毎セッション読み込むと重いので、このCLAUDE.mdには取り込まない（@importしない）。
実装タスクのときに該当箇所を明示して読むこと。
例: 「@docs/design.md の 5-2 に従って Records の API を実装して」

## よく使うコマンド
構成は `backend/`（NestJS）+ `frontend/`（Next.js）の monorepo。
- 環境: `docker compose up -d`（Postgres 起動）/ `docker compose down`
- バックエンド（`backend/` で実行）: `npm run start:dev` / `npm run test` /
  `npm run test:e2e` / `npm run lint` / `npx tsc --noEmit`
- フロント（`frontend/` で実行）: `npm run dev` / `npm run build`
- DB（`backend/` で実行）: `npx prisma migrate dev` / `npx prisma generate` / `npx prisma studio`

初回は `cp .env.example .env` で環境変数を用意する。`.env` はコミットしない。

## 進め方
docs/design.md 末尾「実装の進め方」の順序に従う：
第0部 土台づくり → 第1部 Web → 第2部 デバイス。
