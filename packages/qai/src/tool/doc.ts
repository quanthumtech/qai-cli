import { z } from "zod"
import { Tool } from "./tool"
import path from "path"

export const DocTool = Tool.define({
  description:
    "Generate documentation in various formats (PDF, HTML, DOCX, etc) using Pandoc. Input must be markdown format.",
  parameters: z.object({
    input: z.string().describe("Path to input markdown file"),
    output: z.string().describe("Path for output file (e.g., output.pdf, output.html, output.docx)"),
    format: z
      .enum(["pdf", "html", "docx", "md", "pptx"])
      .optional()
      .describe("Output format (auto-detected from extension if not specified)"),
  }),
  async execute({ input, output, format }, ctx) {
    const inputPath = path.isAbsolute(input) ? input : path.resolve(ctx.cwd, input)
    const outputPath = path.isAbsolute(output) ? output : path.resolve(ctx.cwd, output)

    const ext = format || path.extname(outputPath).slice(1)
    const formats: Record<string, string> = {
      pdf: "pdf",
      html: "html",
      docx: "docx",
      md: "markdown",
      pptx: "pptx",
    }

    const toFormat = formats[ext] || ext
    const proc = Bun.spawnSync({
      cmd: [
        "pandoc",
        inputPath,
        "-o",
        outputPath,
        "--standalone",
        toFormat === "pdf" ? "--pdf-engine=pdflatex" : "",
        toFormat === "html" ? "--self-contained" : "",
      ].filter(Boolean),
      stdout: "pipe",
      stderr: "pipe",
    })

    if (proc.exitCode !== 0) {
      const err = proc.stderr.toString()
      throw new Error(`Pandoc failed: ${err}`)
    }

    return `Created ${outputPath}`
  },
})
