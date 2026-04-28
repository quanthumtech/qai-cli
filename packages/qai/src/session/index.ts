import { z } from "zod"
import { runAgent } from "../agent"
import type { ModelRef } from "../provider"
import { DEFAULTS } from "../provider"
import { DEFAULT_AGENT, type AgentID } from "../agent/agents"
import { countContextTokens, truncateMessages, DEFAULT_TOKEN_LIMITS, estimateTokens } from "../util/token"

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.number(),
})
export type Message = z.infer<typeof MessageSchema>

export const SessionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  cwd: z.string(),
  model: z.object({ providerID: z.string(), modelID: z.string() }),
  agentID: z.string().default(DEFAULT_AGENT),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type Session = z.infer<typeof SessionSchema>

const sessions = new Map<string, Session>()
const messages = new Map<string, Message[]>()

export const Session = {
  async list(): Promise<Session[]> {
    return [...sessions.values()].sort((a, b) => b.updatedAt - a.updatedAt)
  },

  async get(id: string): Promise<Session | undefined> {
    return sessions.get(id)
  },

  async create(input: { id?: string; title?: string; cwd?: string; model?: Partial<ModelRef> }): Promise<Session> {
    const now = Date.now()
    const session: Session = {
      id: input.id ?? crypto.randomUUID(),
      title: input.title,
      cwd: input.cwd ?? process.cwd(),
      model: {
        providerID: input.model?.providerID ?? "anthropic",
        modelID: input.model?.modelID ?? DEFAULTS["anthropic"],
      },
      agentID: DEFAULT_AGENT,
      createdAt: now,
      updatedAt: now,
    }
    sessions.set(session.id, session)
    messages.set(session.id, [])
    return session
  },

  async remove(id: string): Promise<void> {
    sessions.delete(id)
    messages.delete(id)
  },

  async clearMessages(id: string): Promise<void> {
    messages.set(id, [])
  },

  async getMessages(sessionID: string): Promise<Message[]> {
    return messages.get(sessionID) ?? []
  },

  async getMessageCount(sessionID: string): Promise<number> {
    return messages.get(sessionID)?.length ?? 0
  },

  async chat(sessionID: string, content: string, opts?: { abortSignal?: AbortSignal }): Promise<Message> {
    const session = sessions.get(sessionID)
    if (!session) throw new Error(`Session ${sessionID} not found`)

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content, createdAt: Date.now() }
    messages.get(sessionID)!.push(userMsg)

    const allMessages = messages.get(sessionID)!
    const maxHistory = 10
    const recentMessages = allMessages.slice(0, -1).slice(-maxHistory)

    const history = recentMessages.map((m) => ({ role: m.role, content: m.content }) as import("ai").CoreMessage)

    const providerID = session.model.providerID
    const tokenLimit = DEFAULT_TOKEN_LIMITS[providerID] ?? 32000
    const buffer = Math.floor(tokenLimit * 0.3)
    const effectiveLimit = Math.max(tokenLimit - buffer, 5000)

    const { loadAgents, DEFAULT_AGENT } = await import("../agent/agents")
    const agents = await loadAgents()
    const agent = agents[session.agentID as string] ?? agents[DEFAULT_AGENT]
    const maxSystemTokens = 3000
    const systemPrompt = (agent?.systemPrompt ?? "").slice(0, maxSystemTokens * 4)

    const contextTokens = countContextTokens(history, systemPrompt, content, providerID)

    let finalHistory = history
    if (contextTokens > effectiveLimit) {
      const truncated = truncateMessages(history, effectiveLimit, providerID, systemPrompt)
      if (truncated.wasTruncated) {
        finalHistory = truncated.messages
      }
    }

    const reply = await runAgent({
      prompt: content,
      history: finalHistory,
      model: session.model as ModelRef,
      cwd: session.cwd,
      sessionID,
      agentID: session.agentID as AgentID,
      abortSignal: opts?.abortSignal,
    })

    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: reply, createdAt: Date.now() }
    messages.get(sessionID)!.push(assistantMsg)
    session.updatedAt = Date.now()

    return assistantMsg
  },
}
