---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), AskUserQuestion
description: Create a git commit
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Your task

変更内容を分析し、3つのコミットメッセージ候補を生成してユーザーに選択させます。

1. **変更の分析**: diffとgit statusから変更の種類・影響範囲・目的を把握
2. **候補の生成**: 異なる視点で3つのメッセージを作成
   - Conventional Commits形式（feat/fix/docs/refactor/chore等）
   - 日本語で記述（プレフィックスは英語）
   - 各候補は異なる詳細度や視点を提供（例: 技術的詳細重視、ビジネス価値重視、シンプル表現）
3. **ユーザー選択**: AskUserQuestionで3候補を提示し選択を受ける
4. **コミット実行**: 必要に応じてgit addし、選択されたメッセージでコミット

## Constraint

- Claude co-authorshipフッターは不要
- メッセージは日本語（プレフィックスのみ英語）
- 1行で完結（本文なし）
