import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const AttackNames = sqliteTable("attack_names", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  attackName: text("attack_name", { length: 50 }).notNull(),
  description: text("description").notNull(),
  author: text("author", { length: 50 }).notNull(),
  tag: text("tag").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
