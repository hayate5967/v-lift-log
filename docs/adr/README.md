# Architecture Decision Records

1判断 = 1ファイル。「なぜそう決めたか」と「何を捨てたか」を残す。
新しい判断をしたら `0010-` から連番で追加する。ファイル名は `NNNN-kebab-case-title.md`。

書式は既存の ADR に合わせる:
ステータス / 日付 / 背景 / 決定 / 理由 / 検討した代替案 / 影響。

決定を覆すときは元のファイルを書き換えず、**ステータスを「置き換え済み」にして
新しい ADR へのリンクを張る**。判断が変わった経緯も記録の一部。

| # | 判断 |
|---|---|
| [0001](0001-adopt-nestjs.md) | バックエンドに NestJS を採用する |
| [0002](0002-all-web-device-integration.md) | デバイス連携は「全部Web」方式とし、ネイティブアプリと BLE を採らない |
| [0003](0003-tethering-with-wifimanager.md) | ESP32 はテザリング接続とし、WiFiManager でプロビジョニングする |
| [0004](0004-session-based-record-ownership.md) | デバイス記録の帰属は「セッション」で解決する |
| [0005](0005-record-visibility-as-many-to-many.md) | 記録の公開範囲は RecordVisibility による多対多で表現する |
| [0006](0006-monorepo-without-workspaces.md) | backend/ + frontend/ の monorepo とし、npm workspaces は使わない |
| [0007](0007-compose-runs-postgres-only.md) | docker-compose は Postgres だけを対象にする |
| [0008](0008-no-symlink-for-copilot-instructions.md) | copilot-instructions.md をシンボリックリンクにしない |
| [0009](0009-stateless-jwt-in-response-body.md) | 認証はステートレスな JWT とし、トークンはレスポンスボディで返す |
