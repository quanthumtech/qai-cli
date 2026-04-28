import { generateText, tool, type CoreMessage, type ToolCall } from "ai"
import { z } from "zod"
import { getModel, type ModelRef } from "../provider"
import { ReadTool } from "../tool/read"
import { WriteTool } from "../tool/write"
import { EditTool } from "../tool/edit"
import { BashTool } from "../tool/bash"
import { GlobTool } from "../tool/glob"
import { GrepTool } from "../tool/grep"
import type { Tool } from "../tool/tool"
import { loadAgents, DEFAULT_AGENT, type AgentID } from "./agents"

const AVAILABLE_TOOLS = ["read", "write", "edit", "bash", "glob", "grep"]

const TOOL_HINTS: Record<string, string> = {
  ls: "Use 'glob' or 'bash' with 'ls' command instead",
  cat: "Use 'read' tool to view file contents",
  find: "Use 'glob' or 'grep' to search for files",
  pwd: "Use 'bash' with 'pwd' command",
  cd: "The working directory is already set. Reference files using absolute paths.",
  rm: "Use 'bash' with 'rm' command to delete files",
  cp: "Use 'bash' with 'cp' command to copy files",
  mv: "Use 'bash' with 'mv' command to move files",
  mkdir: "Use 'bash' with 'mkdir' command to create directories",
  touch: "Use 'write' tool to create new files",
}

function isUnavailableToolError(error: unknown): { toolName: string; hint: string } | null {
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as any).message)
    const match = msg.match(/unavailable tool '([^']+)'/)
    if (match) {
      const toolName = match[1].toLowerCase()
      const hint = TOOL_HINTS[toolName] || `Use 'glob', 'grep', 'read', 'write', 'edit', or 'bash' instead.`
      return { toolName: match[1], hint }
    }
  }
  return null
}

function wrapTool(def: Tool.Any) {
  return tool({
    description: def.description,
    parameters: def.parameters as z.ZodType,
    execute: (params: any, opts: any) => def.execute(params, opts as any),
  })
}

export async function runAgent(opts: {
  prompt: string
  history: CoreMessage[]
  model: ModelRef
  cwd: string
  sessionID: string
  agentID?: AgentID
  onText?: (text: string) => void
  abortSignal?: AbortSignal
}): Promise<string> {
  const ctx = { sessionID: opts.sessionID, cwd: opts.cwd }
  const agents = await loadAgents()
  const agent = agents[opts.agentID ?? DEFAULT_AGENT] ?? agents[DEFAULT_AGENT]

  const maxSystemTokens = 4000
  const agentPrompt = agent.systemPrompt.slice(0, maxSystemTokens * 4)

  const allTools = {
    read: wrapTool({ ...ReadTool, execute: (p: any) => ReadTool.execute(p, ctx) }),
    write: wrapTool({ ...WriteTool, execute: (p: any) => WriteTool.execute(p, ctx) }),
    edit: wrapTool({ ...EditTool, execute: (p: any) => EditTool.execute(p, ctx) }),
    bash: wrapTool({ ...BashTool, execute: (p: any) => BashTool.execute(p, ctx) }),
    glob: wrapTool({ ...GlobTool, execute: (p: any) => GlobTool.execute(p, ctx) }),
    grep: wrapTool({ ...GrepTool, execute: (p: any) => GrepTool.execute(p, ctx) }),
  }

  // Restrict tools to what the agent declares
  const tools = Object.fromEntries(Object.entries(allTools).filter(([k]) => agent.tools.includes(k)))

  const model = await getModel(opts.model)

  const controller = opts.abortSignal ? { aborted: false } : null
  if (opts.abortSignal) {
    opts.abortSignal.addEventListener("abort", () => {
      if (controller) controller.aborted = true
    })
  }

  try {
    let result = await generateText({
      model,
      system: agentPrompt + `\nThe current working directory is: ${opts.cwd}`,
      messages: [...opts.history, { role: "user", content: opts.prompt }],
      tools,
      maxSteps: 20,
      abortSignal: opts.abortSignal,
      onStepFinish({ text }) {
        if (text && opts.onText) opts.onText(text)
        if (opts.abortSignal?.aborted) {
          const err = new Error("Aborted")
          err.name = "AbortError"
          throw err
        }
      },
    })

    if (opts.abortSignal?.aborted) {
      const err = new Error("Aborted")
      err.name = "AbortError"
      throw err
    }

    const { text, steps } = result

    if (!text) {
      const allText = steps
        .map((s) => s.text)
        .filter(Boolean)
        .join("\n")
        .trim()
      return allText || "(no response)"
    }

    return text
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    const isRetryableError =
      errMsg.includes("max_tokens") ||
      errMsg.includes("context_length") ||
      errMsg.includes("rate_limit") ||
      errMsg.includes("timeout") ||
      errMsg.includes("unavailable tool")

    if (isRetryableError && !opts.history.some((m) => m.role === "system" && m.content.includes("RETRY_ATTEMPT"))) {
      const attemptNum =
        opts.history.filter((m) => m.role === "system" && m.content.includes("RETRY_ATTEMPT")).length + 1

      const retryHistory = opts.history.slice(-6).filter((m) => m.role !== "system")
      const shortSystem = agent.systemPrompt.slice(0, 2000)
      const retrySystem = `${shortSystem}\n\n[RETRY_ATTEMPT ${attemptNum}] Previous error: ${errMsg.slice(0, 150)}\nThe current working directory is: ${opts.cwd}`

      const retryResult = await generateText({
        model,
        system: retrySystem,
        messages: [...opts.history.slice(-6), { role: "user", content: opts.prompt }],
        tools,
        maxSteps: 20,
        abortSignal: opts.abortSignal,
      })

      const { text, steps } = retryResult
      if (!text) {
        const allText = steps
          .map((s) => s.text)
          .filter(Boolean)
          .join("\n")
          .trim()
        return allText || "(no response)"
      }
      return text
    }
    throw err
  }
}
