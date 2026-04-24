import { z } from "zod"
import * as fs from "fs/promises"
import * as path from "path"
import { Tool } from "./tool"

export const WriteTool = Tool.define({
  description: "Write content to a file, creating it if it doesn't exist.",
  parameters: z.object({
    filePath: z.string().describe("Absolute path to the file to write"),
    content: z.string().describe("Content to write to the file"),
  }),
  async execute({ filePath, content }, ctx) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(ctx.cwd, filePath)
    await fs.mkdir(path.dirname(resolved), { recursive: true })
    await fs.writeFile(resolved, content, "utf-8")
    return `Wrote ${resolved}`
  },
})
