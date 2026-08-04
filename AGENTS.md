# v-lift-log — AI Agent Instructions（共通指示の唯一のソース）

すべてのAIツール（Claude Code / GitHub Copilot 等）が従う共通指示。
個別ツールの指示ファイルはこのファイルを参照/取り込む。1か所を直せば全ツールに効く。

## プロジェクト概要
部活向けトレーニング記録共有アプリ＋計測デバイス。Big3中心のセット・重量・回数・速度を
記録し、グループ単位で共有する。計測デバイス(ESP32)はプレス合図(ブザー)を出し、
速度・レップ数をセッション経由で記録する。
- 詳細な仕様は `docs/design.md`（設計書）を参照する。実装前に該当セクションを読むこと。
- 設計判断の理由は `docs/adr/` に1判断1ファイルで記録する。

## 技術スタック
- バックエンド: NestJS (TypeScript) + Prisma + PostgreSQL
- フロント: Next.js (App Router) + React + TypeScript
- 認証: JWT 自前実装 (Passport)
- デバイス: ESP32 + MPU-6050 + ブザー（WiFi/テザリング接続、HTTP＋APIキー）
- ローカル環境: Docker（`docker compose up -d` で Postgres。アプリはホストで起動）

## リポジトリ構成
```
backend/    NestJS + Prisma（未作成。docs/design.md 5-1 のモジュール分割に従う）
frontend/   Next.js App Router（未作成）
docs/       design.md（設計書）/ adr/（意思決定の記録）
.claude/rules/   ファイル種別ごとの設計ルール（パススコープ）
.github/    workflows/ci.yml / pull_request_template.md / copilot-instructions.md
docker-compose.yml   ローカルの Postgres
.env.example         環境変数の雛形（.env はコミットしない）
```

## アーキテクチャの決まり（厳守）
- NestJSは3層を守る:
  Controller（HTTP入口・入力バリデーションのみ）
  → Service（ビジネスロジック・認可判定）
  → Repository/Prisma（DBアクセス）。層を飛び越えない。
- 認可判定はService層に置く。Controllerやフロント側の判定に依存しない。
- 記録の閲覧可否は「所有者本人 or 公開先グループに所属」で判定する（design.md 3章の認可ロジック）。

## Git / PR フロー
- `main` に直pushしない。必ず `feature/xxx` ブランチ → PR → CIグリーン → マージ。
- コミットは Conventional Commits（feat/fix/refactor/test/docs/chore）。粒度は小さく。
- PRは pull_request_template.md に沿って「変更内容・理由・テスト・確認事項」を書く。

## テスト（最重要）
- 認可ロジックは必ずテストする：「閲覧権限のない記録が見えないこと」「本人以外が編集・削除できないこと」を検証。
- バックエンド: Jest（Service単体 + 主要エンドポイントのe2e）。フロント: 主要フローのE2E（Playwright）。
- 実装完了を報告する前に、lint・typecheck・テストを必ず通す。

## コード品質
- ESLint + Prettier に従う。`tsc --noEmit` で型エラーゼロ。
- 秘密情報（JWT秘密鍵・デバイスAPIキー・.env）は絶対にコミットしない。`.env.example` を更新する。
- DBスキーマ変更は必ず Prisma migration として残す。

## セキュリティ
- パスワードはハッシュ化して保存（平文禁止）。入力は class-validator でバリデーション。
- デバイスからの送信はデバイスAPIキーで認証。ユーザー操作はJWTで認証。

## スコープ外（やらない）
- コメント/いいね、プッシュ通知、ネイティブアプリ、BLE、大会運営、栄養管理。
