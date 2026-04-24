import { z } from "zod"
import * as fs from "fs/promises"
import * as path from "path"
import { Tool } from "./tool"

export const GlobTool = Tool.define({
  description: "Find files matching a glob pattern.",
  parameters: z.object({
    pattern: z.string().describe("Glob pattern to match files"),
    cwd: z.string().optional().describe("Directory to search in (defaults to session cwd)"),
  }),
  async execute({ pattern, cwd: dir }, ctx) {
    const base = dir ?? ctx.cwd
    const glob = new Bun.Glob(pattern)
    const files: string[] = []
    for await (const file of glob.scan({ cwd: base, absolute: true })) {
      files.push(file)
    }
    return files.join("\n") || "(no matches)"
  },
})
