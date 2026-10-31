import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite", // D1はSQLiteベースのため
  schema: "./src/db/schema.ts", // スキーマファイルの場所
  out: "./drizzle", // マイグレーションSQLの出力先
});
