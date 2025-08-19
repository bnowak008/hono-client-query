import { Hono } from "hono";

const app = new Hono().basePath("/api")
  .get("/", (c) => {
    return c.json({
      message: "Hello World",
    });
  })
  .get("/test", (c) => {
    return c.json({
      message: "Hello World",
    });
  });

export default app;
export type AppType = typeof app;
