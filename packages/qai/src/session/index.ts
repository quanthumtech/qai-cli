import { z } from "zod"

export const SessionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type Session = z.infer<typeof SessionSchema>

const sessions = new Map<string, Session>()

export const Session = {
  async list(): Promise<Session[]> {
    return [...sessions.values()].sort((a, b) => b.updatedAt - a.updatedAt)
  },

  async get(id: string): Promise<Session | undefined> {
    return sessions.get(id)
  },

  async create(input: { id?: string; title?: string }): Promise<Session> {
    const now = Date.now()
    const session: Session = {
      id: input.id ?? crypto.randomUUID(),
      title: input.title,
      createdAt: now,
      updatedAt: now,
    }
    sessions.set(session.id, session)
    return session
  },

  async remove(id: string): Promise<void> {
    sessions.delete(id)
  },
}
