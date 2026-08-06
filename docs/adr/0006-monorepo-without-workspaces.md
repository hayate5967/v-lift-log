# ADR-0006: backend/ + frontend/ の monorepo とし、npm workspaces は使わない

- ステータス: 採用
- 日付: 2026-08-04

## 背景

バックエンド（NestJS）とフロントエンド（Next.js）をどう配置するかを決める必要があった。
1つのリポジトリにまとめる方針は早い段階で決まっていたが、
npm workspaces で束ねるかどうかが未決だった。

## 決定

リポジトリ直下に `backend/` と `frontend/` を並べる。それぞれが独立した
`package.json` と `package-lock.json` を持つ。**npm workspaces は使わない。**

ルートにも `package.json` を1つ置くが、これは husky / lint-staged を置くための入れ物で、
アプリの依存は一切持たせない。

## 理由

- CI が各アプリを独立したジョブとして扱えるため、`cache-dependency-path` を
  それぞれの lockfile に向けるだけでキャッシュが効く。ジョブの独立性も保てる。
- workspaces にすると lockfile が1つに統合され、片方の依存を変えただけで
  もう片方のキャッシュも無効化される。
- Prisma と Next.js はどちらも `node_modules` の解決位置に敏感で、
  hoisting が絡むと原因の分かりにくい不具合を踏みやすい。
  学習の主眼はそこではないので、複雑さを持ち込まない。
- 各アプリのディレクトリで `npm ci` するだけで動くので、手順が説明しやすい。

## 検討した代替案

- **npm workspaces**: lockfile が1つで済み、共通パッケージの切り出しが楽。
  将来 API の型を共有したくなったら再検討する価値はある。
- **リポジトリを2つに分ける**: PR とバージョンの同期が面倒になり、
  設計と実装を1つの PR で追えなくなる。

## 影響

- `node_modules` が3か所（ルート / backend / frontend）にできる。
- 開発を始めるときはルートで `npm install`（husky の有効化）が必要になる。README に明記する。
- 型を共有したくなった場合は、この ADR を見直して workspaces 化を検討する。
