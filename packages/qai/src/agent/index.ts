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

const SYSTEM = `You are QAI, an AI coding agent. You help users with software development tasks.
You have access to tools to read/write files, run bash commands, and search code.
Always use absolute paths when working with files. Be concise and precise.`

function wrapTool(def: Tool.Any) {
  return tool({
    description: def.description,
    parameters: def.parameters as z.ZodType,
    execute: (params: any, opts: any) => def.execute(params, opts as any),
  })
}

export async function runAgent(opts: {
  prompt: string
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

  const model = getModel(opts.model)

  const { text } = await generateText({
    model,
    system: SYSTEM,
    prompt: opts.prompt,
    tools,
    maxSteps: 20,
    onStepFinish({ text }) {
      if (text && opts.onText) opts.onText(text)
    },
  })

  return text
}
