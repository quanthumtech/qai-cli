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
  onText?: (text: string) => void
}): Promise<string> {
  const ctx = { sessionID: opts.sessionID, cwd: opts.cwd }

  const tools = {
    read: wrapTool({ ...ReadTool, execute: (p: any) => ReadTool.execute(p, ctx) }),
    write: wrapTool({ ...WriteTool, execute: (p: any) => WriteTool.execute(p, ctx) }),
    edit: wrapTool({ ...EditTool, execute: (p: any) => EditTool.execute(p, ctx) }),
    bash: wrapTool({ ...BashTool, execute: (p: any) => BashTool.execute(p, ctx) }),
    glob: wrapTool({ ...GlobTool, execute: (p: any) => GlobTool.execute(p, ctx) }),
    grep: wrapTool({ ...GrepTool, execute: (p: any) => GrepTool.execute(p, ctx) }),
  }

  const model = await getModel(opts.model)

  const { text, steps } = await generateText({
    model,
    system: `You are QAI, an AI coding agent. You help users with software development tasks.
You have access to tools to read/write files, run bash commands, and search code.
The current working directory is: ${opts.cwd}
Always use absolute paths. When creating files, use paths inside ${opts.cwd} unless the user explicitly says otherwise.
Be concise and precise.
IMPORTANT: Only use tools when the task genuinely requires file system access or running commands.
For conceptual questions, explanations, code examples, or general knowledge — answer directly in text without calling any tool.`,
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
