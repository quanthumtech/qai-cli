import { z } from "zod"
import * as fs from "fs/promises"
import * as path from "path"
import { Tool } from "./tool"

export const EditTool = Tool.define({
  description: "Edit a file by replacing an exact string with new content.",
  parameters: z.object({
    filePath: z.string().describe("Absolute path to the file to edit"),
    oldString: z.string().describe("The exact string to replace"),
    newString: z.string().describe("The replacement string"),
  }),
  async execute({ filePath, oldString, newString }, ctx) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(ctx.cwd, filePath)
    const content = await fs.readFile(resolved, "utf-8")
    if (!content.includes(oldString)) throw new Error(`String not found in ${resolved}`)
    const updated = content.replace(oldString, newString)
    await fs.writeFile(resolved, updated, "utf-8")
    return `Edited ${resolved}`
  },
})
