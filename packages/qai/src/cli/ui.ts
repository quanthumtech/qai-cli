export const LOGO = `
   ____  ___    ____
  / __ \\/ _ |  /  _/
 / /_/ / __ |_/ /  
 \\___\\_\\/_/ |___/  
`

export const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  white: "\x1b[97m",
  bgBlue: "\x1b[44m",
}

const c = COLORS

export function printLogo(providerID: string, modelID: string, agentID: string = "dev") {
  console.clear()
  console.log(c.cyan + c.bold + LOGO + c.reset)
  console.log(c.gray + "  AI coding agent" + c.reset + c.dim + "  v1.0" + c.reset)
  console.log(c.gray + "  ─────────────────────────────────────" + c.reset)
  console.log(c.gray + `  provider  ` + c.white + providerID + c.reset)
  console.log(c.gray + `  model     ` + c.white + modelID + c.reset)
  console.log(c.gray + `  agent     ` + c.cyan + agentID + c.reset)
  console.log(c.gray + "  ─────────────────────────────────────" + c.reset)
  console.log()
  console.log(c.dim + "  Type your message and press Enter. Type 'exit' to quit." + c.reset)
  console.log(c.dim + "  Commands: /help  /agents  /provider  /model <id>  /clear" + c.reset)
  console.log()
}

function statusBar(): string {
  const width = process.stdout.columns || 80
  const home = process.env.HOME || ""
  const cwd = process.cwd()
  const dir = cwd.startsWith(home) ? "~" + cwd.slice(home.length) : cwd

  let branch = ""
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"], { cwd })
    if (result.exitCode === 0) branch = result.stdout.toString().trim()
  } catch {}

  const left = branch ? `${dir}:${branch}` : dir
  return c.gray + c.dim + " " + left + c.reset
}

export function renderMarkdown(text: string): string {
  const lines = text.split("\n")
  const out: string[] = []
  let inCode = false
  let codeLang = ""

  for (const line of lines) {
    // Code fence
    if (line.startsWith("```")) {
      if (!inCode) {
        inCode = true
        codeLang = line.slice(3).trim()
        out.push(c.dim + "  ┌─ " + (codeLang || "code") + c.reset)
      } else {
        inCode = false
        out.push(c.dim + "  └─────" + c.reset)
      }
      continue
    }

    if (inCode) {
      out.push(c.yellow + "  │ " + c.reset + c.white + line + c.reset)
      continue
    }

    // Headers
    if (line.startsWith("### ")) { out.push(c.cyan + c.bold + "  " + line.slice(4) + c.reset); continue }
    if (line.startsWith("## "))  { out.push(c.cyan + c.bold + "  " + line.slice(3) + c.reset); continue }
    if (line.startsWith("# "))   { out.push(c.cyan + c.bold + "  " + line.slice(2) + c.reset); continue }

    // Bullet
    if (line.match(/^[-*] /)) { out.push("  " + c.cyan + "•" + c.reset + " " + formatInline(line.slice(2))); continue }

    // Numbered list
    if (line.match(/^\d+\. /)) { out.push("  " + formatInline(line)); continue }

    // Blank line
    if (line.trim() === "") { out.push(""); continue }

    out.push("  " + formatInline(line))
  }

  return out.join("\n")
}

function formatInline(text: string): string {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, c.bold + "$1" + c.reset)
  // Inline code
  text = text.replace(/`([^`]+)`/g, c.yellow + "$1" + c.reset)
  return text
}


export function userPrompt() {
  console.log(statusBar())
  process.stdout.write(c.green + c.bold + "  you  " + c.reset + c.white + "› " + c.reset)
}

export function agentPrefix() {
  process.stdout.write(c.cyan + c.bold + "  qai  " + c.reset + c.gray + "› " + c.reset)
}

export function startSpinner(): () => void {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
  let i = 0
  process.stdout.write(c.cyan + c.bold + "  qai  " + c.reset + c.dim)
  const id = setInterval(() => {
    process.stdout.write(`\r  qai  ${c.reset}${c.dim}${frames[i++ % frames.length]} thinking...${c.reset}`)
  }, 80)
  return () => {
    clearInterval(id)
    process.stdout.write(`\r  qai  › ${c.reset}`)
  }
}

export function errorLine(msg: string) {
  console.log(c.red + "  err  " + c.reset + c.dim + msg + c.reset)
}

export function infoLine(msg: string) {
  console.log(c.yellow + "  inf  " + c.reset + c.dim + msg + c.reset)
}
