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

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
