# AIツール用ファイル一式 セットアップ

Claude Code と GitHub Copilot を同じ規約で動かすための構成。
**配置は適用済み**。このファイルは構成の由来と注意点の記録として残す。

## ファイル構成
- AGENTS.md .................. 共通指示の唯一のソース
- CLAUDE.md .................. 軽量。@AGENTS.md を取り込み、docs/design.md を案内
- .github/copilot-instructions.md ... Copilotのレビュー指示（共通部分は AGENTS.md に集約済み）
- .github/pull_request_template.md .. PRテンプレート
- .github/workflows/ci.yml ... CI（lint / 型チェック / テスト / ビルド）
- .claude/rules/*.md ......... ファイル種別ごとの設計ルール（パススコープ）
- docs/design.md ............. 設計書
- docs/adr/ ................... 意思決定の記録（README.md に索引）
- docker-compose.yml ......... ローカルの PostgreSQL
- .env.example / .gitignore ... 環境変数の雛形と、秘密情報のコミット防止
- .husky/pre-commit .......... lint-staged による自動整形＋lint

## 適用済みの内容
1. 上記のパスに配置済み。設計書は `docs/design.md` にリネームして配置した。
2. **copilot-instructions.md のシンボリックリンク化は採用しない。**
   このリポジトリは Windows で `core.symlinks=false` のためリンクが機能しない。
   代わりに「共通指示は AGENTS.md が唯一のソース」と明記した薄いポインタとして運用する。
   → [ADR-0008](docs/adr/0008-no-symlink-for-copilot-instructions.md)
3. CI は `backend/` + `frontend/` の monorepo 構成。Node のバージョンはルートの `.nvmrc`
   を参照する（両ジョブとも `node-version-file`）。
   → [ADR-0006](docs/adr/0006-monorepo-without-workspaces.md)
4. プロジェクト名の仮名 "vlift-log" は、リポジトリ名に合わせて **v-lift-log** に統一済み
   （DB名などの識別子は `vliftlog` のまま）。
5. design.md「実装の進め方」第0部（土台づくり）は完了。
   ESLint + Prettier は `nest new` / `create-next-app` の生成物を使い、
   husky + lint-staged はルートの `package.json` に置いた。

## 注意
- `.claude/rules` のパススコープ・ルールは新しめのClaude Codeが必要。挙動は `/memory` や
  公式ドキュメントで確認する。
- ルートで一度 `npm install` しないと pre-commit フックが有効にならない。
- `main` のブランチ保護（必須チェックに `backend` / `frontend` を指定）は、
  CI が実際にグリーンになったことを確認してから設定する。
