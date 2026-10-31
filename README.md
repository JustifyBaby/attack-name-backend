全ルートに `Authorization: Bearer <API_TOKEN>` が必要です。CORS は全オリジンを許可し、
`OPTIONS` の事前確認のみ認証を省略します。トークン未設定の場合は 503、
トークンなし・不一致の場合は 401 を返します。

ローカル開発では `.dev.vars.example` を `.dev.vars` にコピーし、`API_TOKEN` に
十分に長いランダムな値を設定してください。この値はクライアントと共有する API キーで、
ユーザーごとのログイン認証ではありません。

```sh
cp .dev.vars.example .dev.vars
# .dev.vars の API_TOKEN を設定してから起動
docker compose up --build
```

`.dev.vars` は実行時に読み込み、Docker イメージには含めません。
Node.js がローカルにある場合は、以下でも起動できます。

```sh
npm install
npm run dev
```

動作確認:

```sh
curl -H 'Authorization: Bearer <設定したトークン>' http://localhost:8787/
```

Java AWT 側は HTTP 通信時に同じヘッダーを付けます。

```java
HttpURLConnection connection = (HttpURLConnection)
    new URL("http://localhost:8787/").openConnection();
connection.setRequestProperty("Authorization", "Bearer " + token);
```

`java.net.HttpURLConnection` と `java.net.URL` を import してください。
公開環境への通信には HTTPS を使います。

Cloudflare Workers 本番環境のトークンは Secret として登録してください。

```sh
npx wrangler secret put API_TOKEN
npm run deploy
```

認証と CORS のテスト (Node.js 24):

```sh
npm test
# ローカルに Node.js がない場合:
docker compose run --rm --no-deps backend npm test
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

## Attack names API

全APIに既存のBearerトークンが必要です。更新（U）とページ分割は実装していません。

| Method | Path | 結果 |
| --- | --- | --- |
| GET | `/attack-names` | 全件をID昇順のJSON配列で返す（空なら `[]`） |
| POST | `/attack-names` | 作成したレコードを返す（201） |
| DELETE | `/attack-names/:id` | 指定IDを削除（204、存在しなければ404） |

POSTは `Content-Type: application/json` を指定します。

```json
{
  "attackName": "流星拳",
  "description": "星の勢いで放つ拳",
  "author": "学生",
  "tag": "格闘"
}
```

4項目とも必須の文字列です。前後の空白を除き、空文字は拒否します。
`attackName`・`author`・`tag` は最大50文字、`description` は最大2000文字です。
未知の項目、クライアントからの `id`・`createdAt` 指定も400で拒否します。
`id` は自動採番、`createdAt` はサーバーで生成するUTCのISO 8601文字列です。
DELETEのIDは正の安全な整数のみ受け付け、不正な値は400を返します。
同じAPIトークンを持つクライアントは、全レコードを削除できます。

## D1 setup and checks

Wranglerの `attack_name_backend_db` バインディングをDrizzleに渡しています。
スキーマ変更後はSQLを生成し、デプロイ前に本番D1へ適用してください。

```sh
npm run cf-typegen
npm run typecheck
npm test
npm run db:generate
npm run db:migrate:remote
npm run deploy
```

現在のWrangler設定は `remote: true` のため、`npm run dev` もリモートD1へ接続します。
ローカルD1で開発する場合は `remote` を `false` に変更し、以下を実行します。

```sh
npm run db:migrate:local
npm run dev
```

Node.jsがない場合はDockerイメージをビルドし、同じコマンドを
`docker compose run --rm --no-deps backend npm test` などで実行できます。
マイグレーションSQL・依存を変更したら `docker compose build` で再ビルドしてください。
APIテストはMiniflareの一時的なローカルD1を使い、本番D1には接続しません。
