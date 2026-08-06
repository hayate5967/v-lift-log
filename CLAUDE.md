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
- フロント（`frontend/` で実行）: `npm run dev` / `npm run lint` / `npm run typecheck`
  ※型チェックは `next typegen` が要るので `tsc --noEmit` 単体では落ちる
- DB（`backend/` で実行）: `npx prisma migrate dev` / `npx prisma generate` / `npx prisma studio`

環境変数は3か所（ルート=compose用 / `backend/.env` / `frontend/.env.local`）。
それぞれ `.env.example` からコピーする。`.env` はコミットしない。
セットアップ手順の詳細は README.md を参照。

## 進め方
docs/design.md 末尾「実装の進め方」の順序に従う：
~~第0部 土台づくり~~（完了）→ **第1部 Web** → 第2部 デバイス。

第1部の順序: Auth（登録/ログイン/JWT）→ Groups → Exercises → Records（+認可）→ Feed → Stats。
各機能は Controller / Service / Repository の3層と認可判定を意識して実装する。
