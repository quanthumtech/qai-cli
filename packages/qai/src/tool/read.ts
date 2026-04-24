import { z } from "zod"
import * as fs from "fs/promises"
import * as path from "path"
import { Tool } from "./tool"

export const ReadTool = Tool.define({
  description: "Read the contents of a file. Returns the file content as text.",
  parameters: z.object({
    filePath: z.string().describe("Absolute path to the file to read"),
    offset: z.number().optional().describe("Line number to start reading from (1-indexed)"),
    limit: z.number().optional().describe("Maximum number of lines to read (default 2000)"),
  }),
  async execute({ filePath, offset = 1, limit = 2000 }, ctx) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(ctx.cwd, filePath)
    const content = await fs.readFile(resolved, "utf-8")
    const lines = content.split("\n")
    const start = offset - 1
    const slice = lines.slice(start, start + limit)
    return slice.map((line, i) => `${start + i + 1}: ${line}`).join("\n")
  },
})
