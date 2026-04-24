import { Hono } from "hono"
import { Session } from "../../session/index"

export const sessionRoutes = new Hono()

sessionRoutes.get("/", async (c) => c.json(await Session.list()))

sessionRoutes.post("/", async (c) => {
  const body = await c.req.json()
  return c.json(await Session.create(body), 201)
})

sessionRoutes.get("/:id", async (c) => {
  const session = await Session.get(c.req.param("id"))
  return session ? c.json(session) : c.json({ error: "not found" }, 404)
})

sessionRoutes.delete("/:id", async (c) => {
  await Session.remove(c.req.param("id"))
  return c.body(null, 204)
})

sessionRoutes.get("/:id/message", async (c) => c.json(await Session.getMessages(c.req.param("id"))))

sessionRoutes.post("/:id/message", async (c) => {
  const { content } = await c.req.json<{ content: string }>()
  const reply = await Session.chat(c.req.param("id"), content)
  return c.json(reply, 201)
})
