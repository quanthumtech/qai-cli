import { generateText, tool, type CoreMessage } from "ai"
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
}): Promise<string> {
  const ctx = { sessionID: opts.sessionID, cwd: opts.cwd }
  const agents = await loadAgents()
  const agent = agents[opts.agentID ?? DEFAULT_AGENT] ?? agents[DEFAULT_AGENT]

  const allTools = {
    read: wrapTool({ ...ReadTool, execute: (p: any) => ReadTool.execute(p, ctx) }),
    write: wrapTool({ ...WriteTool, execute: (p: any) => WriteTool.execute(p, ctx) }),
    edit: wrapTool({ ...EditTool, execute: (p: any) => EditTool.execute(p, ctx) }),
    bash: wrapTool({ ...BashTool, execute: (p: any) => BashTool.execute(p, ctx) }),
    glob: wrapTool({ ...GlobTool, execute: (p: any) => GlobTool.execute(p, ctx) }),
    grep: wrapTool({ ...GrepTool, execute: (p: any) => GrepTool.execute(p, ctx) }),
  }

  // Restrict tools to what the agent declares
  const tools = Object.fromEntries(
    Object.entries(allTools).filter(([k]) => agent.tools.includes(k))
  )

  const model = await getModel(opts.model)

  const { text, steps } = await generateText({
    model,
    system: agent.systemPrompt + `\nThe current working directory is: ${opts.cwd}`,
    messages: [...opts.history, { role: "user", content: opts.prompt }],
    tools,
    maxSteps: 20,
    onStepFinish({ text }) {
      if (text && opts.onText) opts.onText(text)
    },
  })

  // If the last step was a tool call with no final text, collect text from all steps
  if (!text) {
    const allText = steps.map(s => s.text).filter(Boolean).join("\n").trim()
    return allText || "(no response)"
  }

  return text
}
