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
    pdfEngine: z.string().optional().describe("PDF engine to use (pdflatex, xelatex, lualatex, wkhtmltopdf)"),
  }),
  async execute({ input, output, format, pdfEngine }, ctx) {
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

    // Para PDF, tenta múltiplos engines automaticamente
    if (toFormat === "pdf") {
      const engines = pdfEngine ? [pdfEngine] : ["pdflatex", "xelatex", "lualatex"]
      let lastError = ""

      for (const engine of engines) {
        // Verifica se o engine existe
        const engineCheck = Bun.spawnSync({ cmd: ["which", engine], stdout: "pipe", stderr: "pipe" })
        if (engineCheck.exitCode !== 0) continue

        const proc = Bun.spawnSync({
          cmd: ["pandoc", inputPath, "-o", outputPath, "--standalone", `--pdf-engine=${engine}`],
          stdout: "pipe",
          stderr: "pipe",
        })

        if (proc.exitCode === 0) {
          return `Created ${outputPath} (using ${engine})`
        }
        lastError = proc.stderr.toString()
      }

      // Se nenhum engine LaTeX funcionou, tenta converter via HTML usando wkhtmltopdf
      const wkhtmlCheck = Bun.spawnSync({ cmd: ["which", "wkhtmltopdf"], stdout: "pipe", stderr: "pipe" })
      if (wkhtmlCheck.exitCode === 0) {
        const htmlPath = outputPath.replace(/\.pdf$/, "-temp.html")

        // Primeiro converte para HTML
        const htmlProc = Bun.spawnSync({
          cmd: ["pandoc", inputPath, "-o", htmlPath, "--standalone"],
          stdout: "pipe",
          stderr: "pipe",
        })

        if (htmlProc.exitCode === 0) {
          // Depois converte HTML para PDF
          const pdfProc = Bun.spawnSync({
            cmd: ["wkhtmltopdf", "--enable-local-file-access", htmlPath, outputPath],
            stdout: "pipe",
            stderr: "pipe",
          })

          // Remove o arquivo HTML temporário
          try {
            await Bun.file(htmlPath).delete()
          } catch {}

          if (pdfProc.exitCode === 0) {
            return `Created ${outputPath} (using wkhtmltopdf)`
          }
          lastError = pdfProc.stderr.toString()
        }
      }

      // Se nada funcionou, tenta usar o Chrome/Chromium headless
      const chromeCheck = Bun.spawnSync({ cmd: ["which", "chromium"], stdout: "pipe", stderr: "pipe" })
      const googleChromeCheck = Bun.spawnSync({ cmd: ["which", "google-chrome"], stdout: "pipe", stderr: "pipe" })
      const chromeCmd =
        chromeCheck.exitCode === 0 ? "chromium" : googleChromeCheck.exitCode === 0 ? "google-chrome" : null

      if (chromeCmd) {
        const htmlPath = outputPath.replace(/\.pdf$/, "-temp.html")

        // Primeiro converte para HTML
        const htmlProc = Bun.spawnSync({
          cmd: ["pandoc", inputPath, "-o", htmlPath, "--standalone"],
          stdout: "pipe",
          stderr: "pipe",
        })

        if (htmlProc.exitCode === 0) {
          // Converte HTML para PDF usando Chrome
          const pdfProc = Bun.spawnSync({
            cmd: [
              chromeCmd,
              "--headless",
              "--disable-gpu",
              "--no-sandbox",
              "--print-to-pdf-no-header",
              "--run-all-compositor-stages-before-draw",
              "--virtual-time-budget=10000",
              `--print-to-pdf=${outputPath}`,
              htmlPath,
            ],
            stdout: "pipe",
            stderr: "pipe",
          })

          // Remove o arquivo HTML temporário
          try {
            await Bun.file(htmlPath).delete()
          } catch {}

          if (pdfProc.exitCode === 0) {
            return `Created ${outputPath} (using ${chromeCmd})`
          }
          lastError = pdfProc.stderr.toString()
        }
      }

      throw new Error(
        `Nenhum engine PDF disponível. Tente instalar:\n` +
          `  - texlive: sudo apt-get install texlive-latex-base texlive-fonts-recommended\n` +
          `  - wkhtmltopdf: sudo apt-get install wkhtmltopdf\n` +
          `  - chromium: sudo apt-get install chromium\n` +
          `Último erro: ${lastError}`,
      )
    }

    // Para outros formatos, usa pandoc normalmente
    const proc = Bun.spawnSync({
      cmd: [
        "pandoc",
        inputPath,
        "-o",
        outputPath,
        "--standalone",
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
