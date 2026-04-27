import { z } from "zod"
import { Tool } from "./tool"

export const BashTool = Tool.define({
  description: "Execute a bash command and return its output.",
  parameters: z.object({
    command: z.string().describe("The bash command to execute"),
    timeout: z.coerce.number().optional().describe("Timeout in milliseconds (default 120000)"),
  }),
  async execute({ command, timeout = 120_000 }, ctx) {
    const proc = Bun.spawn(["bash", "-c", command], {
      cwd: ctx.cwd,
      stdout: "pipe",
      stderr: "pipe",
    })

    const timer = setTimeout(() => proc.kill(), timeout)
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    clearTimeout(timer)

    const out = [stdout, stderr].filter(Boolean).join("\n").trim()
    return exitCode === 0 ? out || "(no output)" : `Exit ${exitCode}\n${out}`
  },
})
