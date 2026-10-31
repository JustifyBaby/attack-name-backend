import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { z } from "zod";
import { AttackNames } from "./db/schema.ts";

type Bindings = Pick<CloudflareBindings, "attack_name_backend_db"> & {
  API_TOKEN?: string;
};

type AppEnv = { Bindings: Bindings };

const app = new Hono<AppEnv>();

const createAttackNameSchema = z
  .object({
    attackName: z.string().trim().min(1).max(50),
    description: z.string().trim().min(1).max(500),
    author: z.string().trim().min(1).max(50),
    tag: z.enum(["攻撃", "回避"]),
    effectId: z.number().int().min(0).max(2).default(0),
  })
  .strict();

const idSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
});

// Preflight requests must be handled before authentication.
app.use("*", cors({ origin: "*" }));

app.use("*", async (c, next) => {
  const token = c.env?.API_TOKEN;
  if (!token?.trim()) {
    return c.json({ error: "Authentication is not configured" }, 503);
  }

  return bearerAuth<AppEnv>({ token })(c, next);
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/attack-names", async (c) => {
  const db = drizzle(c.env.attack_name_backend_db);
  const rows = await db.select().from(AttackNames).orderBy(asc(AttackNames.id));
  return c.json(rows);
});

app.post(
  "/attack-names",
  zValidator("json", createAttackNameSchema),
  async (c) => {
    const db = drizzle(c.env.attack_name_backend_db);
    const [row] = await db
      .insert(AttackNames)
      .values(c.req.valid("json"))
      .returning();
    c.header("Location", `/attack-names/${row.id}`);
    return c.json(row, 201);
  },
);

app.delete("/attack-names/:id", zValidator("param", idSchema), async (c) => {
  const db = drizzle(c.env.attack_name_backend_db);
  const { id } = c.req.valid("param");
  const deleted = await db
    .delete(AttackNames)
    .where(eq(AttackNames.id, id))
    .returning({ id: AttackNames.id });
  if (deleted.length === 0) {
    return c.json({ error: "Attack name not found" }, 404);
  }
  return c.body(null, 204);
});

export default app;
