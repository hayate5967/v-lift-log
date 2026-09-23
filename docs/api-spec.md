# API仕様書

> `docs/design.md` 5-2「API設計」を、実装済み部分は実コード（`backend/src/`）に、
> 未実装部分は設計書の内容に基づいて詳細化したもの。実装が進むにつれて本ドキュメントも更新する。
> 表記: `[実装済み]` = 動作するコードあり / `[未実装]` = 設計のみ（design.md準拠、今後の実装で変わりうる）

## 1. 共通事項

### 1.1 ベースURL・形式

- 開発環境: `http://localhost:3000`（`backend/.env`の`PORT`、既定3000）
- リクエスト/レスポンスは全て `application/json`
- ルーティングにグローバルprefixは無し（`/auth/register`のようにモジュール名から直接始まる）

### 1.2 認証方式

| 区分 | 方式 | 対象 |
|---|---|---|
| `(auth)` | `Authorization: Bearer <JWT>` ヘッダ | ユーザー操作全般 |
| `(member)` | `(auth)` に加え、対象グループの`Membership`が必要 | グループ内情報の取得 |
| `(owner)` | `(auth)` に加え、対象リソースの所有者本人のみ | 記録の更新・削除など |
| `(device)` | デバイス用APIキー（ヘッダ、方式は実装時に確定） | ESP32からのリクエスト |

`(member)`/`(owner)`の判定は**Service層**で行う（Controllerでは判定しない。[.claude/rules/services.md](../.claude/rules/services.md)）。

### 1.3 入力バリデーション

全エンドポイント共通で`ValidationPipe`をグローバル適用（[main.ts](../backend/src/main.ts)）:

- `whitelist: true` — DTOに定義の無いプロパティは自動的に除去
- `forbidNonWhitelisted: true` — 未定義プロパティが送られてきたら`400`で拒否
- `transform: true` — リクエストボディをDTOクラスのインスタンスに変換してから検証

### 1.4 エラーレスポンス形式

カスタムのExceptionFilterは無く、NestJSの既定形式をそのまま使う。

```jsonc
// 単純なエラー（例: 401, 403, 404, 409）
{
  "statusCode": 401,
  "message": "メールアドレスまたはパスワードが正しくありません",
  "error": "Unauthorized"
}

// class-validatorのバリデーションエラー（400）はmessageが配列になる
{
  "statusCode": 400,
  "message": ["email の形式が正しくありません", "password は8文字以上にしてください"],
  "error": "Bad Request"
}
```

| ステータス | 意味 | 主なケース |
|---|---|---|
| 400 Bad Request | 入力バリデーション違反 | DTOの制約違反、未定義プロパティ混入 |
| 401 Unauthorized | 未認証・認証失敗 | JWT無し/不正/期限切れ、ログイン情報不一致 |
| 403 Forbidden | 認可エラー | 所有者でない・所属グループでない（`(member)`/`(owner)`違反） |
| 404 Not Found | リソース不在 | 存在しないID指定 |
| 409 Conflict | 一意制約違反 | メール重複登録、グループ二重参加など |

## 2. Auth `[実装済み]`

実装: [auth.controller.ts](../backend/src/auth/auth.controller.ts) / [auth.service.ts](../backend/src/auth/auth.service.ts)

### POST /auth/register

新規ユーザー登録。成功時はログイン済み状態としてトークンも返す。

**リクエストボディ**（[RegisterDto](../backend/src/auth/dto/register.dto.ts)）

| フィールド | 型 | 制約 |
|---|---|---|
| email | string | メール形式必須 |
| password | string | 8〜72文字（72はbcryptの仕様上限に合わせた明示的制限） |
| name | string | 1〜50文字 |

**レスポンス** `201 Created`

```json
{
  "user": { "id": "cl...", "email": "taro@example.com", "name": "太郎", "createdAt": "2026-09-23T00:00:00.000Z" },
  "token": "<JWT>"
}
```

**エラー**: `409 Conflict`（emailが既に登録済み） / `400`（バリデーション違反）

### POST /auth/login

**リクエストボディ**（[LoginDto](../backend/src/auth/dto/login.dto.ts)）

| フィールド | 型 | 制約 |
|---|---|---|
| email | string | メール形式必須 |
| password | string | 空文字不可（長さ制約は掛けない） |

**レスポンス** `200 OK`

```json
{ "token": "<JWT>" }
```

**エラー**: `401 Unauthorized`（メール不一致・パスワード不一致のいずれも同一メッセージ「メールアドレスまたはパスワードが正しくありません」に統一。登録済みメールの有無を外部から推測されないための設計。メール不一致時もbcrypt.hashを走らせてタイミング攻撃を防止）

### GET /auth/me `(auth)`

**ヘッダ**: `Authorization: Bearer <JWT>`

**レスポンス** `200 OK`

```json
{ "user": { "id": "cl...", "email": "taro@example.com", "name": "太郎", "createdAt": "2026-09-23T00:00:00.000Z" } }
```

**エラー**: `401 Unauthorized`（トークン無し・不正・署名済みだがDB上にユーザーが存在しない場合。退会済みユーザーの旧トークンを弾くため、`JwtStrategy`経由で毎回DBを照合する）

**JWTペイロード**（[auth.types.ts](../backend/src/auth/auth.types.ts)）: `{ sub: userId, email }`。署名のみで暗号化はされないため、機密情報は含めない。

---

## 3. Groups `[未実装]`

```
POST /groups             (auth){name}            → {group, joinCode}  ※作成者は自動的にMembership作成
GET  /groups             (auth)                   → 自分の所属グループ一覧
GET  /groups/:id         (auth, member)           → 詳細 + メンバー一覧
POST /groups/join        (auth){joinCode}         → 参加（Membership作成）
GET  /groups/:id/records (auth, member)?limit&cursor → そのグループに公開された記録一覧
```

- `POST /groups/join`: 存在しない`joinCode` → `404`。既に参加済み → `409`（`(userId, groupId)`一意制約）
- `GET /groups/:id`系: 所属していないグループへのアクセスは`403`

## 4. Exercises `[未実装]`

```
GET  /exercises (auth)        → 既定種目（createdByUserId=null）+ 自分のカスタム種目
POST /exercises (auth){name}  → カスタム種目作成（createdByUserId=自分）
```

## 5. Records `[未実装]`

手入力・デバイス経由の確定記録を問わず、この1系統に集約する。

```
POST   /records     (auth){exerciseId, performedAt, memo?, sets:[{order,weight,reps,velocity?}], visibilityGroupIds:[...]} → {record}
GET    /records     (auth)?limit&cursor          → 自分の記録一覧（ページング）
GET    /records/:id (auth, authorized)           → 詳細（閲覧認可判定あり）
PATCH  /records/:id (auth, owner)                → 更新
DELETE /records/:id (auth, owner)                → 削除
GET    /feed        (auth)?groupId?&limit&cursor → 閲覧可能な記録を新しい順（グループ絞り込み任意）
```

**認可（最重要）**: `GET /records/:id`・`/feed`は「本人 or 公開先グループに所属」で閲覧可否を判定（データ仕様書4章参照）。`PATCH`/`DELETE`は所有者のみ。いずれもService層で判定し、**必ずテストで担保する**（AGENTS.md「テスト」節）。

`visibilityGroupIds`が空配列/未指定の場合、その記録は「自分だけ」（`RecordVisibility`に行を作らない）。

応答の`record`には`sets`・`visibility`・`user{id,name}`に加え`exercise{id,name}`を同梱する。
閲覧者は記録の所有者と異なりうる（グループ公開/Feed）ため、閲覧者自身の`GET /exercises`の
可視性（既定+自分のカスタム）だけでは種目名を解決できないことがあるため。

## 6. Stats `[未実装]`

```
GET /stats (auth)?exerciseId&metric → 自分の記録の推移
```

- `metric`: `maxWeight` | `est1RM` | `maxVelocity` 等（design.md想定）
- 集計対象は常に自分の記録のみ（他人の統計は見られない）

## 7. Devices `[未実装]`（所有者＝ユーザー）

```
POST /devices (auth){name}  → {device, apiKey}  ※apiKeyは登録時に一度だけ平文で返す。以降はハッシュのみ保存し復元不可
GET  /devices (auth)        → 自分のデバイス一覧
```

## 8. Sessions `[未実装]`

```
POST  /sessions          (auth){deviceId, exerciseId, stillDurationMs, targetReps, weight, visibilityGroupIds:[...]}
                              → {session}  ※activeセッション作成＋本人の空Record作成
PATCH /sessions/:id/end  (auth, owner) → セッション終了（Recordを確定。公開先はセッション作成時の設定を適用）
GET   /sessions/active   (auth)        → 自分のactiveセッション（Web側のライブ表示用ポーリング）
```

## 9. Device向けAPI `[未実装]`（ESP32が叩く。`(device)`＝デバイスAPIキー認証）

```
GET  /device/session (device) → {stillDurationMs, targetReps, weight}  ※対象デバイスの現在activeなセッション設定
POST /device/sets    (device){order, reps, velocity} → activeセッションのRecordにSetを追記
                              ※weightはセッション設定から補完。記録の所有者はセッションのuserId
```

- 認証: ユーザー操作のJWTとは別系統。デバイス側は発行済みAPIキーをヘッダ等で送信し、`Device.apiKeyHash`と照合
- `GET /device/session`は設定変更をポーリングで反映する想定（design.md D-4）
