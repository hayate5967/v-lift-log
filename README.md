# v-lift-log

部活向けトレーニング記録共有アプリ＋計測デバイス。Big3中心のセット・重量・回数・速度を記録し、
グループ単位で共有する。計測デバイス（ESP32）はプレス合図（ブザー）を出し、速度・レップ数を
セッション経由で記録する。

- 設計書: [docs/design.md](docs/design.md)
- 意思決定の記録: [docs/adr/](docs/adr/)
- AI ツール向けの共通指示: [AGENTS.md](AGENTS.md)

## 技術スタック

| 領域 | 採用技術 |
|---|---|
| バックエンド | NestJS (TypeScript) + Prisma |
| DB | PostgreSQL 16（ローカルは Docker） |
| フロントエンド | Next.js (App Router) + React + TypeScript |
| 認証 | JWT 自前実装 (Passport) |
| 計測デバイス | ESP32 + MPU-6050 + ブザー（WiFi テザリング / HTTP + APIキー） |

## リポジトリ構成

```
backend/            NestJS + Prisma          ※未作成
frontend/           Next.js App Router       ※未作成
docs/design.md      設計書
docs/adr/           ADR（1判断1ファイル）
.claude/rules/      ファイル種別ごとの設計ルール（Claude Code のパススコープ）
.github/workflows/ci.yml   CI（lint / typecheck / test / build）
docker-compose.yml  ローカルの PostgreSQL
```

## セットアップ

```bash
git clone <this repo>
cd v-lift-log
cp .env.example .env      # 値を確認・必要なら変更
docker compose up -d      # PostgreSQL を起動
docker compose ps         # STATUS が healthy になるのを確認
```

`backend/` と `frontend/` はまだ存在しない。生成手順は
[docs/design.md](docs/design.md) 末尾「実装の進め方」第0部を参照。生成後は:

```bash
cd backend  && npm ci && npx prisma migrate dev && npm run start:dev
cd frontend && npm ci && npm run dev
```

## 起動・よく使うコマンド

| 用途 | コマンド | 実行場所 |
|---|---|---|
| Postgres 起動 / 停止 | `docker compose up -d` / `docker compose down` | ルート |
| Postgres のデータごと削除 | `docker compose down -v` | ルート |
| バックエンド開発サーバ | `npm run start:dev` | `backend/` |
| 単体テスト / e2e | `npm run test` / `npm run test:e2e` | `backend/` |
| lint / 型チェック | `npm run lint` / `npx tsc --noEmit` | `backend/`, `frontend/` |
| マイグレーション | `npx prisma migrate dev` | `backend/` |
| Prisma Client 生成 | `npx prisma generate` | `backend/` |
| DB GUI | `npx prisma studio` | `backend/` |
| フロント開発サーバ | `npm run dev` | `frontend/` |

## 環境変数

`.env.example` をコピーして `.env` を作る。**`.env` はコミットしない**（`.gitignore` 済み）。
`docker compose` はルートの `.env` を自動で読む。

| 変数 | 用途 | 既定値 |
|---|---|---|
| `POSTGRES_USER` | Postgres のユーザー | `postgres` |
| `POSTGRES_PASSWORD` | Postgres のパスワード | `postgres` |
| `POSTGRES_DB` | データベース名 | `vliftlog` |
| `DB_PORT` | ホスト側の公開ポート（5432 が埋まっていれば変更） | `5432` |
| `DATABASE_URL` | Prisma の接続文字列 | `postgresql://postgres:postgres@localhost:5432/vliftlog?schema=public` |
| `JWT_SECRET` | JWT の署名鍵。本番では必ずランダム値に置換 | `change-me-in-local-only` |
| `JWT_EXPIRES_IN` | JWT の有効期限 | `7d` |
| `PORT` | バックエンドの待ち受けポート | `3000` |
| `NEXT_PUBLIC_API_BASE_URL` | フロントから見た API のベースURL | `http://localhost:3000` |

デバイス用 API キーは DB にハッシュで保存する（`.env` には置かない）。発行時に一度だけ表示される。

## 開発フロー

- `main` に直 push しない。`feature/xxx` → PR → CI グリーン → マージ。
- コミットは Conventional Commits（`feat:` `fix:` `refactor:` `test:` `docs:` `chore:`）。
- PR は [.github/pull_request_template.md](.github/pull_request_template.md) に沿って書く。
- 詳細は [AGENTS.md](AGENTS.md) と docs/design.md 第3部。

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) が PR と main への push で走る。

- `backend` ジョブ: Postgres サービスを立てて
  `npm ci → prisma generate → prisma migrate deploy → lint → tsc --noEmit → test（カバレッジ付き）
  → test:e2e → build`
- `frontend` ジョブ: `npm ci → lint → tsc --noEmit → test → build`

> **現時点の既知の制約**: `backend/` `frontend/` と各 `package-lock.json` がまだ無いため、
> CI は `npm ci` の段階で失敗する。これは想定内で、第0部のスキャフォールドを終えた時点で
> グリーンになる。ブランチ保護の必須チェックには、ジョブ名 `backend` / `frontend` を指定する。
