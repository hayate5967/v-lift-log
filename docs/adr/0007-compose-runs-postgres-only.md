# ADR-0007: docker-compose は Postgres だけを対象にする

- ステータス: 採用
- 日付: 2026-08-04

## 背景

「誰でも `docker compose up` で同じ環境」を目標にしていたが、
どこまでコンテナ化するか（DB だけか、アプリも含めるか）が未決だった。

## 決定

`docker-compose.yml` は PostgreSQL のみを定義する。
backend と frontend はホスト側で `npm run start:dev` / `npm run dev` する。

## 理由

- 環境差が実際に問題になるのは DB（バージョン・拡張・初期化）であって、Node アプリは
  `.nvmrc` と lockfile でほぼ再現できる。コンテナ化の効果が薄い。
- ホストで直接動かすほうが、ホットリロード・デバッガ接続・`npx prisma studio` などが素直に動く。
  Windows のバインドマウント上でのファイル監視は取りこぼしや遅さの問題が起きやすい。
- Dockerfile を保守する手間が増えず、`docker compose up -d` の起動も速い。
- design.md P-3 も「docker-compose で Postgres（＋必要ならバックエンド）」と、
  DB を主対象に置いた書き方をしている。

## 検討した代替案

- **Postgres + backend**: 再現性は上がるが Dockerfile.dev の保守と
  Windows でのファイル監視の手当てが必要。
- **フルスタックをコンテナ化**: `docker compose up` だけで全部動くのは魅力だが、
  初期構築コストが最も高く、開発体験が落ちる。

## 影響

- compose の `db` サービスには healthcheck を付けてある。将来 backend をコンテナ化する場合、
  `depends_on: { condition: service_healthy }` をそのまま使える。
- compose の Postgres イメージと CI の service コンテナは**同じ `postgres:16-alpine` に揃える**。
  片方を上げるときはもう片方も合わせること。
- ルートの `.env` は compose 専用。アプリの環境変数は `backend/.env` と
  `frontend/.env.local` に分ける（Prisma CLI が `backend/.env` しか読まないため）。
