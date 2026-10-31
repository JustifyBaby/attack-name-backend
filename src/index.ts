import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";

type Bindings = {
  API_TOKEN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Preflight requests must be handled before authentication.
app.use("*", cors({ origin: "*" }));

app.use("*", (c, next) => {
  const token = c.env?.API_TOKEN;
  if (!token?.trim()) {
    return c.json({ error: "Authentication is not configured" }, 503);
  }

  return bearerAuth({ token })(c, next);
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

export default app;
