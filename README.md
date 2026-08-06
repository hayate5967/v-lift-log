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
| バックエンド | NestJS 11 (TypeScript) + Prisma 6 |
| DB | PostgreSQL 16（ローカルは Docker） |
| フロントエンド | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 |
| 認証 | JWT 自前実装 (Passport) |
| 計測デバイス | ESP32 + MPU-6050 + ブザー（WiFi テザリング / HTTP + APIキー） |

Node は `.nvmrc` の **24** を使う（CI も同じファイルを参照する）。

## リポジトリ構成

```
backend/            NestJS + Prisma
  prisma/schema.prisma   docs/design.md 5-3 のスキーマ
  src/prisma/            PrismaService / PrismaModule（Global）
frontend/           Next.js App Router + Tailwind
docs/design.md      設計書
docs/adr/           ADR（1判断1ファイル）
.claude/rules/      ファイル種別ごとの設計ルール（Claude Code のパススコープ）
.github/workflows/ci.yml   CI（lint / typecheck / test / build）
docker-compose.yml  ローカルの PostgreSQL
.husky/pre-commit   lint-staged による自動整形＋lint
```

`backend/` と `frontend/` は独立した `package.json` を持つ（npm workspaces は使わない。
理由は [ADR-0006](docs/adr/0006-monorepo-without-workspaces.md)）。

## セットアップ

```bash
git clone git@github.com:hayate5967/v-lift-log.git
cd v-lift-log

# 1. ルート: pre-commit フックを有効化する（husky）
npm install

# 2. 環境変数
cp .env.example .env                      # compose 用
cp backend/.env.example backend/.env      # DATABASE_URL / JWT_SECRET
cp frontend/.env.example frontend/.env.local

# 3. PostgreSQL を起動
docker compose up -d
docker compose ps                         # STATUS が healthy になるまで待つ

# 4. バックエンド
cd backend
npm ci
npx prisma migrate dev                    # スキーマ適用 + Prisma Client 生成
npm run start:dev                         # http://localhost:3000

# 5. フロントエンド（別ターミナル）
cd frontend
npm ci
npm run dev                               # http://localhost:3001 など
```

> ルートの `npm install` を飛ばすと pre-commit フックが動かない。必ず一度は実行すること。

## よく使うコマンド

| 用途 | コマンド | 実行場所 |
|---|---|---|
| Postgres 起動 / 停止 | `docker compose up -d` / `docker compose down` | ルート |
| Postgres をデータごと作り直す | `docker compose down -v && docker compose up -d` | ルート |
| バックエンド開発サーバ | `npm run start:dev` | `backend/` |
| 単体テスト / e2e | `npm run test` / `npm run test:e2e` | `backend/` |
| lint / 自動修正 | `npm run lint` / `npm run lint:fix` | `backend/`, `frontend/` |
| 型チェック | `npx tsc --noEmit` / `npm run typecheck` | `backend/` / `frontend/` |
| マイグレーション作成 | `npx prisma migrate dev --name <name>` | `backend/` |
| DB GUI | `npx prisma studio` | `backend/` |
| フロント開発サーバ | `npm run dev` | `frontend/` |

`frontend` の型チェックは `next typegen` が生成する型（`LayoutProps` 等）に依存するため、
`tsc --noEmit` 単体ではなく `npm run typecheck` を使う。

## 環境変数

`.env` は**絶対にコミットしない**（`.gitignore` 済み）。値を増やしたら対応する
`.env.example` も更新する。3か所に分かれているのは、**Prisma CLI が `backend/.env` しか
読まない**ため（[ADR-0007](docs/adr/0007-compose-runs-postgres-only.md)）。

### ルート `.env` — docker-compose 専用

| 変数 | 用途 | 既定値 |
|---|---|---|
| `POSTGRES_USER` | Postgres のユーザー | `postgres` |
| `POSTGRES_PASSWORD` | Postgres のパスワード | `postgres` |
| `POSTGRES_DB` | データベース名 | `vliftlog` |
| `DB_PORT` | ホスト側の公開ポート | `5432` |

### `backend/.env`

| 変数 | 用途 | 既定値 |
|---|---|---|
| `DATABASE_URL` | Prisma の接続文字列 | `postgresql://postgres:postgres@localhost:5432/vliftlog?schema=public` |
| `JWT_SECRET` | JWT の署名鍵。本番では必ずランダム値に置換 | `change-me-in-local-only` |
| `JWT_EXPIRES_IN` | JWT の有効期限 | `7d` |
| `PORT` | 待ち受けポート | `3000` |

### `frontend/.env.local`

| 変数 | 用途 | 既定値 |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | フロントから見た API のベースURL | `http://localhost:3000` |

デバイス用 API キーは DB にハッシュで保存する（`.env` には置かない）。発行時に一度だけ表示される。

## 開発フロー

- `main` に直 push しない。`feature/xxx` → PR → CI グリーン → マージ。
- コミットは Conventional Commits（`feat:` `fix:` `refactor:` `test:` `docs:` `chore:`）。
- コミット時に husky + lint-staged が走り、変更したファイルだけ Prettier と ESLint が当たる。
  緊急時は `git commit --no-verify` で回避できるが、常用しない。
- PR は [.github/pull_request_template.md](.github/pull_request_template.md) に沿って書く。
- 詳細は [AGENTS.md](AGENTS.md) と docs/design.md 第3部。

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) が PR と main への push で走る。

- `backend`: Postgres サービスを立てて
  `npm ci → prisma generate → prisma migrate deploy → lint → tsc --noEmit →
  test（カバレッジ付き）→ test:e2e → build`
- `frontend`: `npm ci → lint → typecheck → test → build`

Playwright による E2E は ci.yml にコメントで骨格を用意してある。
主要フロー（ログイン→記録→フィード）が実装できた段階で有効化する。
