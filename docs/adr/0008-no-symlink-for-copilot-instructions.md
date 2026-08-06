# ADR-0008: copilot-instructions.md をシンボリックリンクにしない

- ステータス: 採用
- 日付: 2026-08-04

## 背景

AI ツール（Claude Code / GitHub Copilot）に同じ規約を守らせるため、
`AGENTS.md` を共通指示の唯一のソースとしている。
Copilot は `.github/copilot-instructions.md` を読むため、内容が重複しかねない。
当初のセットアップ手順は、重複を避ける方法としてシンボリックリンクを提案していた:

```
ln -sfn ../AGENTS.md .github/copilot-instructions.md
```

## 決定

シンボリックリンクにはしない。`.github/copilot-instructions.md` は
**「共通指示は AGENTS.md が唯一のソース」と明記した薄いポインタ**として維持し、
そこには Copilot をコードレビュアーとして使うときの観点だけを書く。

## 理由

- 開発環境が Windows で、このチェックアウトは `core.symlinks=false`。
  リンクがリンクとして復元されず、パスが書かれただけのテキストファイルになる。
- `core.symlinks=true` にするには Developer Mode か管理者権限が必要で、
  クローンする人全員に同じ設定を要求することになる。
- Copilot がリンク先を解決して読む保証もない。
- 実際には重複していない。AGENTS.md は「何を守るか」、copilot-instructions.md は
  「レビュー時に何を見るか」で役割が違う。無理に1ファイルにする理由が薄い。

## 検討した代替案

- **シンボリックリンク**: 重複はゼロになるが上記のとおり Windows で機能しない。
- **CI で AGENTS.md の内容をコピーして生成する**: 同期は保証されるが、
  生成物をコミットする運用が増え、レビュー観点を別に書けなくなる。

## 影響

- `.github/copilot-instructions.md` を更新するときは、
  共通ルールを書き足さないよう注意する（それは AGENTS.md に書く）。
- 元のセットアップ手順にあったシンボリックリンクの案内は SETUP.md から削除済み。
