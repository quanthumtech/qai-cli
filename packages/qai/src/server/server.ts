import { Hono } from "hono"
import { sessionRoutes } from "./routes/session"

const app = new Hono()

app.get("/health", (c) => c.json({ status: "ok" }))
app.route("/session", sessionRoutes)

export async function serve(port = 4096) {
  Bun.serve({ fetch: app.fetch, port })
  console.log(`QAI server running on http://localhost:${port}`)
}
