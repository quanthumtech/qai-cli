import path from "path"
import fs from "fs"
import { DocTool } from "../tool/doc"
import { ToolContext } from "../tool/tool"

/**
 * Simple CLI utility to generate a DOCX documentation file for the project.
 * It takes the main README.md (or a provided markdown file) and converts it to DOCX
 * using the DocTool (which wraps pandoc). The output path can be any absolute path.
 */
export async function generateDoc({ input = "README.md", output }: { input?: string; output: string }) {
  const cwd = process.cwd()
  const ctx: ToolContext = { cwd, env: process.env }

  // Resolve input markdown file
  const inputPath = path.isAbsolute(input) ? input : path.resolve(cwd, input)
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input markdown file not found: ${inputPath}`)
  }

  // Ensure output directory exists
  const outputPath = path.isAbsolute(output) ? output : path.resolve(cwd, output)
  const outDir = path.dirname(outputPath)
  fs.mkdirSync(outDir, { recursive: true })

  // Use DocTool to perform conversion
  const result = await DocTool.execute({ input: inputPath, output: outputPath, format: undefined }, ctx)
  console.log(result)
}

// If run directly via node
if (require.main === module) {
  const args = process.argv.slice(2)
  if (args.length < 1) {
    console.error("Usage: node generate-doc.js <output-path> [input-markdown]")
    process.exit(1)
  }
  const [output, input] = args
  generateDoc({ input, output }).catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
