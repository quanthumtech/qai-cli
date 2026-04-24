import { Hono } from "hono"
import { Session } from "../session"

export const sessionRoutes = new Hono()

sessionRoutes.get("/", async (c) => {
  const sessions = await Session.list()
  return c.json(sessions)
})

sessionRoutes.post("/", async (c) => {
  const body = await c.req.json()
  const session = await Session.create(body)
  return c.json(session, 201)
})

sessionRoutes.get("/:id", async (c) => {
  const session = await Session.get(c.req.param("id"))
  if (!session) return c.json({ error: "not found" }, 404)
  return c.json(session)
})

sessionRoutes.delete("/:id", async (c) => {
  await Session.remove(c.req.param("id"))
  return c.body(null, 204)
})
