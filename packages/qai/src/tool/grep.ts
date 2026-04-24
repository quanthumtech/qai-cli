import { z } from "zod"
import { Tool } from "./tool"

export const GrepTool = Tool.define({
  description: "Search for a pattern in files using ripgrep.",
  parameters: z.object({
    pattern: z.string().describe("Regex pattern to search for"),
    path: z.string().optional().describe("File or directory to search in"),
    glob: z.string().optional().describe("Glob pattern to filter files (e.g. '*.ts')"),
  }),
  async execute({ pattern, path: searchPath, glob }, ctx) {
    const args = ["rg", "--line-number", "--no-heading", pattern]
    if (glob) args.push("--glob", glob)
    args.push(searchPath ?? ctx.cwd)

    const proc = Bun.spawn(args, { cwd: ctx.cwd, stdout: "pipe", stderr: "pipe" })
    const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()])
    await proc.exited
    return stdout.trim() || stderr.trim() || "(no matches)"
  },
})
