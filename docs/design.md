# 部活トレーニング記録共有アプリ ― 設計書

> LINEヤフー Summer Product Sprint の予行練習として開発。
> このドキュメントは実装（Claude Code / VS Code）に渡すための設計書です。
> 構成は 2部：**第1部 Webアプリ編** / **第2部 計測デバイス編（道A: 全部Web）**。

---

## 0. 技術スタック（確定）

| 領域 | 採用技術 | 選定理由 |
|---|---|---|
| フロントエンド(Web) | Next.js (App Router) + React + TypeScript | 業界標準。iPhone Safari含め全端末で動く。ネイティブアプリ不要（URLだけで配布） |
| バックエンド | NestJS (TypeScript) | Controller/Service/Repository + DI を強制。Clean/Layered を体得 |
| DB | PostgreSQL + Prisma (ORM) | 関係が明確なデータに最適。多対多を設計する練習。ローカルは Docker |
| 認証 | JWT 自前実装 (NestJS + Passport) | 認証の仕組みを根っこから学ぶ（BaaSは使わない） |
| 計測デバイス | ESP32 + MPU-6050(IMU) + ブザー | 速度算出・レップカウント・プレス判定。**WiFi（テザリング）でバックエンドに直接接続** |

**デバイス連携の方針（道A: 全部Web）**
- ネイティブアプリ/BLEは採用しない。理由: iOS SafariはWeb Bluetooth非対応、ブラウザ↔ローカル機器の直接接続も不可、ネイティブアプリはストア配布が手間。
- ESP32はスマホの**テザリング（通常のWPA2）**でネットに出て、バックエンドに直接つなぐ（eduroamのWPA2-Enterprise複雑さを回避）。
- プレス合図の**音はESP32のブザーでローカル完結**（即時・確実・ネット不要）。
- 設定・記録・閲覧はすべてWeb（サーバー経由・多少の遅延OK・iPhoneでも動く）。

**全体方針**: 簡単さより学習を優先。Supabase等のBaaSは使わず、認証・API・DBアクセスを自分で書く。

---

# 第1部　Webアプリ編

## 1. 課題設定

パワーリフティング部／筋トレ部では、各部員がセット・重量・回数を紙やバラバラのアプリで記録しており、
(1) 自分の過去の記録を振り返りにくい、(2) 速度など競技特有のデータを一元管理できていない、
(3) 他の部員が今どんなトレーニングをしているか見えず、刺激や指導の材料にしづらい、という課題がある。

このアプリは、部員が Big3 中心のトレーニング記録（種目・重量・回数・セット・速度）を一元的に記録でき、
柔軟な公開範囲設定のもとで部内で共有・閲覧できるようにする。
計測デバイス（第2部）が算出した速度・レップ数も、セッション経由で自動的に記録される。

**ターゲットユーザー**: 部員（記録する人／他人の記録を見る人）。

## 2. 要件定義

### 機能要件

**認証**: ユーザーは登録・ログインできる

**グループ**
- グループを作成できる（作成者は自動的にメンバー）／参加コードで参加できる／複数グループに同時所属できる

**記録**
- トレーニング記録を作成できる（種目・実施日・複数セット）。各セットは 重量・回数、速度は任意
- 公開先を選べる（複数グループ同時公開可。未選択なら「自分だけ」）
- 自分の記録を編集・削除できる／自分が閲覧権限を持つ記録を閲覧できる

**閲覧・共有**
- 活動フィード（閲覧可能な記録を新しい順・グループ絞り込み可）／グループ詳細（メンバー＋記録）／振り返り（種目別・時系列）

**統計**: 種目・指標（最大重量・推定1RM・速度など）を選び、自分の記録の推移をグラフで見られる

**種目**: 既定種目＋カスタム種目の追加

**デバイス連携（詳細は第2部）**
- ユーザーはWebで「デバイスセッション」を開始し、デバイス・種目・設定（静止時間の閾値・目標レップ・重量）・公開先を指定できる
- セッション中に計測デバイスが送るデータ（レップ数・速度）は、そのユーザーの記録として自動保存される
- ユーザーはセッションを終了できる

### 非機能要件

- **セキュリティ（最重要）**: 閲覧権限のない記録は絶対に見えない。本人しか自分の記録を編集・削除できない。デバイスからの送信はデバイス用APIキーで認証。
- **パフォーマンス**: フィード・一覧はページング。100人規模でも重くならない。
- **スケーラビリティ**: 部員100人・記録数万件でも耐えるスキーマ設計（適切なインデックス）。

### スコープ

- ✅ やる: 認証 / グループ / 記録CRUD / 公開範囲設定 / フィード / 振り返り / 統計 / カスタム種目 / デバイスセッション連携
- ❌ やらない: コメント・いいね / プッシュ通知 / 大会運営 / 栄養管理 / 外部SNS連携 / ネイティブアプリ / BLE

## 3. 情報設計（データモデル）

```
User ──< Membership >── Group            (多対多: 所属)
  │                        │
  ├──< Record >──< RecordVisibility >────┘   (多対多: 公開範囲)
  │      │
  │      ├── Exercise                    (種目。既定 or カスタム)
  │      └──< Set                        (重量・回数・速度[任意])
  │
  ├──< Device                            (所有する計測デバイス)
  └──< Session ── Device / Exercise / Record   (デバイス使用セッション。本人と紐づく)
```

**エンティティ定義**

- **User**: id, email(一意), passwordHash, name, createdAt
- **Group**: id, name, joinCode(一意), createdAt
- **Membership**: id, userId, groupId, joinedAt ／ (userId, groupId) 一意
- **Exercise**: id, name, createdByUserId(nullable: null=既定), createdAt
- **Record**: id, userId(所有者), exerciseId, performedAt, memo(nullable), createdAt
- **Set**: id, recordId, order, weight, reps, velocity(nullable=任意), createdAt
- **RecordVisibility**: id, recordId, groupId ／ (recordId, groupId) 一意。行が無い記録=非公開
- **Device**: id, userId(所有者), name, apiKeyHash, createdAt
- **Session**: id, deviceId, userId, exerciseId, recordId, stillDurationMs, targetReps, weight, status(active/ended), startedAt, endedAt(nullable)
  - Webで開始すると、そのユーザー用の空のRecordを作り、デバイスと本人を紐づける
  - デバイスから来たセットは、このセッションのRecordに追記される

**認可ロジック（重要）**: ユーザー U が記録 R を閲覧できる条件は
1. `R.userId == U.id`（自分）、または 2. R の RecordVisibility の groupId が U の所属グループに含まれる。
編集・削除は所有者のみ。

## 4. 画面設計

**モバイルファースト**（ジムでその場で操作）。下タブで移動。

```
認証: /login, /register
メイン(下タブ):
  /feed          活動フィード
  /records       自分の記録一覧 + [新規作成(手入力)]
  /groups        所属グループ一覧
  /stats         統計グラフ
  /device        デバイスセッション（開始・設定・ライブ・終了）
記録: /records/new, /records/[id]
グループ: /groups/[id], /groups/new, /groups/join
```

**デバイスセッション画面の要点**
- デバイス選択 → 種目・静止時間の閾値・目標レップ・重量・公開先を設定 → [セッション開始]
- セッション中: 送られてきたレップ数・速度を表示（サーバー経由・多少の遅延OK）
- [セッション終了] で記録を確定

**記録作成（手入力）画面の要点**（デバイスを使わない人向け）
- 種目・日付、セットを[+追加]（重量・回数必須／速度任意）、公開先は複数チェック可＋「自分だけ」

**UX上の意図**: 記録入力を最短に／公開先は作成時に選ぶ（スコープ管理）／フィードにグループ絞り込み（スケーラビリティ配慮）

## 5. 技術設計

### 5-1. アーキテクチャ

```
[Webブラウザ(iPhone Safari含む)] ─ HTTP(REST/JSON, JWT) ─┐
                                                         ├→ [NestJS] ─Prisma─→ [PostgreSQL]
[ESP32(テザリングでWiFi)] ─ HTTP(REST/JSON, APIキー) ─────┘
   └ 静止検知→ブザー（ローカル・即時、ネット非依存）
```

**NestJS 層構造（各モジュール共通）**: Controller（入口・バリデーション）→ Service（ロジック・認可）→ Repository（Prisma）

**モジュール分割**: AuthModule / UsersModule / GroupsModule / ExercisesModule / RecordsModule（記録CRUD+フィード+認可の中心）/ StatsModule / DevicesModule / SessionsModule

**Web フロント（Next.js App Router）**: `app/(auth)/…`, `app/(main)/feed|records|groups|stats|device|…`。API通信は共通クライアント層に集約。JWTはhttpOnly Cookie推奨。

### 5-2. API設計（REST）

`(auth)`=JWT必須、`(member)`=所属必須、`(owner)`=所有者のみ、`(device)`=デバイスAPIキー必須。

**Auth**
```
POST /auth/register {email,password,name} → {user,token}
POST /auth/login    {email,password}      → {token}
GET  /auth/me       (auth)                → {user}
```

**Groups**
```
POST /groups             (auth){name}            → {group,joinCode}（作成者は自動参加）
GET  /groups             (auth)                  → 所属グループ一覧
GET  /groups/:id         (auth,member)           → 詳細+メンバー
POST /groups/join        (auth){joinCode}        → 参加
GET  /groups/:id/records (auth,member)?limit&cursor → そのグループ公開の記録
```

**Exercises**
```
GET  /exercises (auth)        → 既定+自分のカスタム
POST /exercises (auth){name}  → カスタム作成
```

**Records**（手入力も、デバイス経由の確定記録もここに集約）
```
POST   /records     (auth){exerciseId,performedAt,memo?,sets:[{order,weight,reps,velocity?}],visibilityGroupIds:[...]} → {record}
GET    /records     (auth)?limit&cursor          → 自分の記録一覧
GET    /records/:id (auth,authorized)            → 詳細（認可判定）
PATCH  /records/:id (auth,owner)                 → 更新
DELETE /records/:id (auth,owner)                 → 削除
GET    /feed        (auth)?groupId?&limit&cursor → 閲覧可能な記録を新しい順
```

**Stats**
```
GET /stats (auth)?exerciseId&metric → 自分の記録の推移（metric=maxWeight|est1RM|maxVelocity 等）
```

**Devices（所有者=ユーザー）**
```
POST /devices     (auth){name}  → {device, apiKey}  ※apiKeyは一度だけ表示。ハッシュ保存
GET  /devices     (auth)        → 自分のデバイス一覧
```

**Sessions（デバイス使用セッション: 誰の記録にするかを紐づける）**
```
POST  /sessions            (auth){deviceId,exerciseId,stillDurationMs,targetReps,weight,visibilityGroupIds:[...]}
                                → {session}  ※activeなセッション生成＋本人の空Recordを作成
PATCH /sessions/:id/end    (auth,owner)     → セッション終了（Recordを確定）
GET   /sessions/active     (auth)           → 自分のactiveセッション（Web画面のライブ表示用）
```

**Device向け（ESP32が叩く。APIキー認証）**
```
GET  /device/session (device) → 自分(デバイス)の現在のactiveセッションの設定
                                  {stillDurationMs, targetReps, weight} を返す（ESP32はこれをポーリング）
POST /device/sets    (device){order, reps, velocity} → activeセッションのRecordにSetを追記
                                  （weightはセッション設定から補完。セッションのユーザーの記録になる）
```

**エラー方針**: 適切なHTTPステータス（400/401/403/404/409 等）+ JSONエラーボディ。

### 5-3. DB設計（Prisma スキーマ）

```prisma
model User {
  id           String       @id @default(cuid())
  email        String       @unique
  passwordHash String
  name         String
  createdAt    DateTime     @default(now())
  memberships  Membership[]
  records      Record[]
  exercises    Exercise[]
  devices      Device[]
  sessions     Session[]
}

model Group {
  id             String             @id @default(cuid())
  name           String
  joinCode       String             @unique
  createdAt      DateTime           @default(now())
  memberships    Membership[]
  visibleRecords RecordVisibility[]
}

model Membership {
  id       String   @id @default(cuid())
  userId   String
  groupId  String
  joinedAt DateTime @default(now())
  user     User     @relation(fields: [userId], references: [id])
  group    Group    @relation(fields: [groupId], references: [id])
  @@unique([userId, groupId])
  @@index([groupId])
}

model Exercise {
  id              String    @id @default(cuid())
  name            String
  createdByUserId String?   // null = 既定種目
  createdBy       User?     @relation(fields: [createdByUserId], references: [id])
  createdAt       DateTime  @default(now())
  records         Record[]
  sessions        Session[]
}

model Record {
  id          String             @id @default(cuid())
  userId      String
  exerciseId  String
  performedAt DateTime
  memo        String?
  createdAt   DateTime           @default(now())
  user        User               @relation(fields: [userId], references: [id])
  exercise    Exercise           @relation(fields: [exerciseId], references: [id])
  sets        Set[]
  visibility  RecordVisibility[]
  session     Session?
  @@index([userId, performedAt])
}

model Set {
  id       String @id @default(cuid())
  recordId String
  order    Int
  weight   Float
  reps     Int
  velocity Float?  // 任意（手入力で未計測なら null）
  record   Record  @relation(fields: [recordId], references: [id], onDelete: Cascade)
  @@index([recordId])
}

model RecordVisibility {
  id       String @id @default(cuid())
  recordId String
  groupId  String
  record   Record @relation(fields: [recordId], references: [id], onDelete: Cascade)
  group    Group  @relation(fields: [groupId], references: [id])
  @@unique([recordId, groupId])
  @@index([groupId])
}

model Device {
  id         String    @id @default(cuid())
  userId     String
  name       String
  apiKeyHash String
  createdAt  DateTime  @default(now())
  user       User      @relation(fields: [userId], references: [id])
  sessions   Session[]
  @@index([userId])
}

model Session {
  id              String    @id @default(cuid())
  deviceId        String
  userId          String
  exerciseId      String
  recordId        String    @unique
  stillDurationMs Int
  targetReps      Int
  weight          Float
  status          String    @default("active") // active | ended
  startedAt       DateTime  @default(now())
  endedAt         DateTime?
  device          Device    @relation(fields: [deviceId], references: [id])
  user            User      @relation(fields: [userId], references: [id])
  exercise        Exercise  @relation(fields: [exerciseId], references: [id])
  record          Record    @relation(fields: [recordId], references: [id])
  @@index([deviceId, status])
}
```

---

# 第2部　計測デバイス編（道A: 全部Web）

## D-1. 全体像

```
┌ ESP32 + MPU-6050 + ブザー（バー上）──────────────┐
│ ・加速度を読む → レップ検出・回数カウント・速度算出   │
│ ・バー静止を検出（閾値=セッション設定）→ ブザーを鳴らす │
│   （ローカル完結・即時・ネット不要）                 │
│ ・テザリングのWiFiでバックエンドに接続               │
│ ・GET /device/session で設定を取得（ポーリング）      │
│ ・POST /device/sets でセット結果を送信（APIキー認証）  │
└──────────────┬────────────────────────────┘
        WiFi(テザリング) │ HTTP(APIキー)
        ┌──────────────┴──────────────┐
        │      [NestJS バックエンド]       │
        │  ・activeセッションの設定を返す    │
        │  ・来たセットを本人のRecordに保存  │
        └──────────────┬──────────────┘
             HTTP(JWT) │
    [Webブラウザ(iPhone Safari含む)]
        ・セッション開始（デバイス・種目・設定・公開先）
        ・ライブ表示（レップ・速度）
        ・セッション終了
```

## D-2. ハードウェア構成

- **マイコン**: ESP32（WiFi内蔵）
- **センサー**: MPU-6050（加速度・角速度 IMU）をバーに装着
- **出力**: 小型ブザー（プレス合図用。数十円）＋必要ならLED
- **電源**: バッテリー or USB

## D-3. ネットワーク（テザリングオンリー + WiFiManager）

- ESP32はスマホの**テザリング（通常のWPA2）**に接続 → `WiFi.begin(ssid, password)` で済む（eduroam等のWPA2-Enterprise対応は不要）。
- **WiFiプロビジョニングは WiFiManager 方式（確定）**: 共有デバイスなので、テザリングのSSID/パスワードは焼き込まない。`WiFiManager` ライブラリでESP32を一時的なアクセスポイントにし、使う人がスマホのブラウザで開く設定ページに**自分のテザリングのSSID/パスワードを入力**する。焼き直し不要で、誰のテザリングにも対応できる。
  - 「テザリング名を固定（BenchDevice等）」案は不採用。理由: iPhoneはテザリング名=端末名のため、固定名にするには端末を改名する必要があり、iPhoneユーザーに不便。WiFiManager方式なら各自が自分の情報を入れるだけで、スマホ側の設定変更が要らない。
- ESP32↔スマホは「同じテザリング内」だが通信は**直接ではなくバックエンド経由**。

## D-4. デバイス側ロジック

- **レップ検出**: MPU-6050の加速度から挙上（コンセントリック）局面を検出しカウント
- **速度算出**: 挙上区間の加速度を積分して平均/最大速度を推定（VBT）
- **プレス判定**: バーが胸位置で「低速度が stillDurationMs 継続」→ **その場でブザー**（ローカル・即時）
- **設定反映**: `GET /device/session` をポーリングし、stillDurationMs・targetReps・weight を取得して判定に使用
- **結果送信**: セット完了ごとに `POST /device/sets {order, reps, velocity}` を送る
- **軽い再送**: 送信失敗時は本体に一時保持し、次に繋がったら再送（一瞬の切断で記録を失わない安全策。フルのオフライン対応まではやらない）

## D-5. セッションの流れ（誰の記録になるか）

1. ユーザーがWebで「セッション開始」（デバイス・種目・静止時間・目標レップ・重量・公開先を指定）
   → backendがactiveセッション＋本人の空Recordを作成
2. ESP32が `GET /device/session` で設定を取得
3. セット実施 → ブザー（即時・ローカル）→ `POST /device/sets` でレップ数・速度を送信
   → backendがセッションのRecord（＝本人の記録）にSetを追記
4. ユーザーがWebで「セッション終了」→ Recordを確定（公開先はセッション設定を適用）

---

# 第3部　開発プロセス・品質方針

> インターン「Summer Product Sprint」で問われる実務レベルのチーム開発を予行練習するための方針。
> 一人開発だが、チームの作法を"ソロ版"に翻訳して実践する（例: 他人のレビュー→セルフレビュー、
> デイリースタンドアップ→日次の進捗メモ）。核（P-1〜P-4）をしっかり、P-5は軽めに。

## P-1. バージョン管理とチーム開発フロー

- **ブランチ戦略**: GitHub Flow。`main` は常にデプロイ可能な状態を保つ。作業は `feature/xxx` ブランチで行う。
- **コミット規約**: Conventional Commits（`feat:` `fix:` `refactor:` `test:` `docs:` `chore:`）。粒度は小さく。
- **PR運用**: ソロでも `main` に直pushしない。`feature → PR → セルフレビュー → マージ` を徹底。
  PRテンプレートに「変更内容 / 理由 / テスト / 確認事項」を書く。
- **セルフレビューのコツ**: PRを出したら差分を通しで読む（一晩置くと粗が見える）。加えて、**GitHub Copilot のコードレビュー機能をレビュアーとして活用する**。PRに Copilot を割り当てると、変更差分に対して自動でレビューコメント（バグ・改善提案・命名や設計の指摘）が付くので、一人開発でも「他者レビュー」に近い視点が得られる。Copilotの指摘は鵜呑みにせず、採否は自分で判断する（レビューを"受ける→考える→反映"の練習にする）。
- **ブランチ保護**: `main` へのマージは CI green を必須にする（GitHubの設定で強制）。

## P-2. CI/CD と自動テスト

- **CI（GitHub Actions）**: PR時に `lint → typecheck → test → build` を自動実行。1つでも落ちたらマージ不可。
- **テスト構成**:
  - バックエンド（NestJS + Jest）: 単体（Service層、特に**認可**やバッティング等のロジック）＋ e2e（主要エンドポイント、認可の境界）
  - フロント: 主要コンポーネント＋ E2E（Playwright）は主要フロー（ログイン→記録→フィード）
  - **必ずテストする**: 認可（見えてはいけない記録が見えないこと）。このアプリで最重要。
- **カバレッジ**: 数値目標より「重要ロジックは必ず覆う」。CIで表示。
- **CD**: `main` マージで自動デプロイ（デプロイ先は任意）。まずはCIを固め、デプロイは手動→自動の順でも可。

## P-3. コード品質と環境の再現性

- **Lint/Format**: ESLint + Prettier で整形・命名を統一。`tsc --noEmit` で型チェック。
- **pre-commit**: husky + lint-staged で、コミット前に自動整形＆lint。壊れたコードが入らない仕組み。
- **環境再現**: `docker-compose` で Postgres（＋必要ならバックエンド）を定義。誰でも `docker compose up` で同じ環境。
- **設定管理**: `.env` はコミットしない。`.env.example` を用意。秘密情報（JWT秘密鍵・デバイスAPIキー）はコミット厳禁。
- **DBマイグレーション**: Prisma Migrate。スキーマ変更は必ずマイグレーションとして履歴に残す。

## P-4. 設計・意思決定の記録

- **README**: セットアップ手順・起動方法・環境変数一覧。
- **ADR（Architecture Decision Records）**: 1判断=1ファイル（`docs/adr/0001-xxx.md`）。今回決めた判断を記録する:
  例）NestJS採用 / 道A（全部Web）採用とネイティブ却下 / テザリング+WiFiManager / セッション方式の記録帰属 / グループのフラット構造 / 記録↔グループ多対多 …
  → 「なぜそうしたか」が残り、発表の**質疑応答**で強い武器になる。
- **API仕様**: NestJS + Swagger（`@nestjs/swagger`）で OpenAPI を自動生成。

## P-5. その他（軽め）

- **タスク管理**: GitHub Issues + Projects（カンバン）。マイルストーンは「第1部Web完成 → 第2部デバイス」。日次で進捗を1行メモ（デイリースタンドアップのソロ版）。
- **パフォーマンス・負荷**: ページング・インデックスは設計済み。余裕があれば k6 / Artillery で簡易負荷テスト（100人想定）。
- **発表・デモ**: ADRを土台にデモの筋書きを用意。設計判断を言葉で説明できるようにしておく。

**インターン使用ツールとの対応**: GitHub（バージョン管理）/ GitHub Actions（CI/CD）はそのまま使用。Slack・Miro・Figma・Confluence・GWSはチーム協働用なので、ソロでは README・ADR・GitHub Issues が代替になる。

---

## 実装の進め方（推奨順序）

**第0部（土台づくり ← 第3部の方針を最初に敷く）**
0. リポジトリ初期化: Git/GitHub、ESLint+Prettier、husky+lint-staged、docker-compose(Postgres)、GitHub ActionsのCI雛形、`.env.example`、PRテンプレート、`docs/adr/` を用意。以降は必ず feature ブランチ→PR→CI green→マージ で進める。

**第1部（Web）**
1. 環境構築: Docker で Postgres 起動 → Prisma スキーマ適用（migrate）
2. バックエンド: Auth（登録/ログイン/JWT）→ Groups → Exercises → Records（+認可）→ Feed → Stats
3. Webフロント: 認証 → 記録作成/一覧 → フィード → グループ → 統計
4. CI: GitHub Actions で自動テスト（本番インターンの予行として1回通す）

**第2部（デバイス）**
5. バックエンド: Devices（登録・APIキー）→ Sessions（開始/終了）→ Device向けAPI（/device/session, /device/sets）
6. ESP32: MPU-6050読み取り → レップ検出・速度算出・静止検知（まずシリアルで確認）→ ブザー
7. ESP32: WiFi（テザリング）接続＋WiFiManagerプロビジョニング → バックエンドへHTTP（設定取得・結果送信）
8. Web: デバイスセッション画面（開始・ライブ表示・終了）

各機能は「Controller/Service/Repository の3層」と「認可判定」を意識して実装する。
特に Records の認可（誰がどの記録を見られるか）と、Session経由の記録帰属が設計の肝。
