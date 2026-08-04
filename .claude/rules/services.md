---
paths:
  - '**/*.service.ts'
---
- ビジネスロジックと認可判定はここに置く。
- 記録の閲覧可否は「所有者本人 or 公開先グループに所属」で判定する（docs/design.md 3章）。
- DBアクセスを直接書かず、Repository/Prisma 経由にする。
