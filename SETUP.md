# AIツール用ファイル一式 セットアップ

Claude Code と GitHub Copilot を同じ規約で動かすための構成。
**配置は適用済み**（下記のとおり）。このファイルは構成の由来と注意点の記録として残す。

## ファイル構成
- AGENTS.md .................. 共通指示の唯一のソース
- CLAUDE.md .................. 軽量。@AGENTS.md を取り込み、docs/design.md を案内
- .github/copilot-instructions.md ... Copilotのレビュー指示（共通部分は AGENTS.md に集約済み）
- .github/pull_request_template.md .. PRテンプレート
- .github/workflows/ci.yml ... CI（lint / 型チェック / テスト / ビルド）
- .claude/rules/*.md ......... ファイル種別ごとの設計ルール（パススコープ）
- docs/design.md ............. 設計書
- docs/adr/ ................... 意思決定の記録（0001- から増やす）
- docker-compose.yml ......... ローカルの PostgreSQL
- .env.example / .gitignore ... 環境変数の雛形と、秘密情報のコミット防止

## 適用済みの内容
1. 上記のパスに配置済み。設計書は `docs/design.md` にリネームして配置した。
2. **copilot-instructions.md のシンボリックリンク化は採用しない。**
   このリポジトリは Windows で `core.symlinks=false` のためリンクが機能しない。
   代わりに「共通指示は AGENTS.md が唯一のソース」と明記した薄いポインタとして運用する。
3. CI は `backend/` + `frontend/` の monorepo 構成に確定。working-directory と
   cache-dependency-path はそれに合わせてある。
4. プロジェクト名の仮名 "vlift-log" は、リポジトリ名に合わせて **v-lift-log** に統一済み
   （DB名などの識別子は `vliftlog` のまま）。

## 残っている作業
- `backend/`（NestJS + Prisma）と `frontend/`（Next.js）のスキャフォールド。
  **これができるまで CI は `npm ci` の時点で失敗する**（package.json が無いため）。
  手順は docs/design.md「実装の進め方」第0部を参照。
- スキャフォールド時に、CI が呼ぶ npm スクリプト（`lint` / `test` / `test:e2e` / `build`）を
  各 package.json に用意する。
- Playwright の E2E ジョブは ci.yml にコメントで骨格を置いてある。フロント実装後に有効化する。
- GitHub 側で main のブランチ保護を設定し、必須チェックに `backend` / `frontend` を指定する。

## 注意
- .claude/rules のパススコープ・ルールは新しめのClaude Codeが必要。挙動は `/memory` や
  公式ドキュメントで確認する。
