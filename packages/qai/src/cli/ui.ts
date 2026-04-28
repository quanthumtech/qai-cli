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
  bgGray: "\x1b[100m",
}

const c = COLORS

// Arrow-key selection menu. Returns selected item or null if cancelled.
export async function selectMenu(items: string[], current: string): Promise<string | null> {
  if (!process.stdin.isTTY) return null

  let idx = Math.max(0, items.indexOf(current))
  const visible = 12 // max rows shown at once

  const draw = () => {
    const start = Math.max(0, Math.min(idx - Math.floor(visible / 2), items.length - visible))
    const slice = items.slice(start, start + visible)
    process.stdout.write("\x1b[?25l") // hide cursor
    slice.forEach((item, i) => {
      const abs = start + i
      const selected = abs === idx
      const marker = selected ? c.bgGray + c.white + c.bold : c.reset + c.dim
      const active = item === current ? c.cyan + " ◀" + c.reset : ""
      process.stdout.write(`\r${marker}  ${item}${c.reset}${active}\x1b[K\n`)
    })
    // move cursor back up
    process.stdout.write(`\x1b[${slice.length}A`)
  }

  const clear = (n: number) => {
    for (let i = 0; i < n; i++) process.stdout.write(`\r\x1b[K\n`)
    process.stdout.write(`\x1b[${n}A`)
  }

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding("utf8")

  draw()

  return new Promise((resolve) => {
    const onData = (key: string) => {
      const sliceLen = Math.min(visible, items.length)
      if (key === "\x1b[A" || key === "\x1b[D") {
        // up / left
        idx = (idx - 1 + items.length) % items.length
        clear(sliceLen)
        draw()
      } else if (key === "\x1b[B" || key === "\x1b[C") {
        // down / right
        idx = (idx + 1) % items.length
        clear(sliceLen)
        draw()
      } else if (key === "\r" || key === "\n") {
        // enter
        clear(sliceLen)
        process.stdin.removeListener("data", onData)
        process.stdin.setRawMode(false)
        process.stdout.write("\x1b[?25h") // show cursor
        // drain any buffered input before resuming readline
        process.stdin.pause()
        setTimeout(() => resolve(items[idx]), 10)
      } else if (key === "\x03" || key === "\x1b") {
        // ctrl+c / esc
        clear(sliceLen)
        process.stdin.removeListener("data", onData)
        process.stdin.setRawMode(false)
        process.stdout.write("\x1b[?25h")
        process.stdin.pause()
        setTimeout(() => resolve(null), 10)
      }
    }
    process.stdin.on("data", onData)
  })
}

export function printLogo(providerID: string, modelID: string, agentID: string = "dev") {
  console.clear()
  console.log(c.cyan + c.bold + LOGO + c.reset)
  console.log(c.gray + "  AI coding agent" + c.reset + c.dim + "  v1.0" + c.reset)
  console.log(c.gray + "  ─────────────────────────────────────" + c.reset)
  console.log(c.gray + "  By: Quanthum Tec" + c.reset)
  console.log(c.gray + `  provider  ` + c.white + providerID + c.reset)
  console.log(c.gray + `  model     ` + c.white + modelID + c.reset)
  console.log(c.gray + `  agent     ` + c.cyan + agentID + c.reset)
  console.log(c.gray + "  ─────────────────────────────────────" + c.reset)
  console.log()
  console.log(c.dim + "  Type your message and press Enter. Type 'exit' to quit." + c.reset)
  console.log(c.dim + "  Commands: /help  /agents  /provider  /model <id>  /clear" + c.reset)
  console.log()
}

export function statusBar(): string {
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
    if (line.startsWith("### ")) {
      out.push(c.cyan + c.bold + "  " + line.slice(4) + c.reset)
      continue
    }
    if (line.startsWith("## ")) {
      out.push(c.cyan + c.bold + "  " + line.slice(3) + c.reset)
      continue
    }
    if (line.startsWith("# ")) {
      out.push(c.cyan + c.bold + "  " + line.slice(2) + c.reset)
      continue
    }

    // Bullet
    if (line.match(/^[-*] /)) {
      out.push("  " + c.cyan + "•" + c.reset + " " + formatInline(line.slice(2)))
      continue
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      out.push("  " + formatInline(line))
      continue
    }

    // Blank line
    if (line.trim() === "") {
      out.push("")
      continue
    }

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
  process.stdout.write(c.green + c.bold + "  you  " + c.reset + c.white + "› " + c.reset)
}

export function agentPrefix() {
  process.stdout.write(c.cyan + c.bold + "  qai  " + c.reset + c.gray + "› " + c.reset)
}

export function startSpinner(): { stop: () => void; setCancelHint: (show: boolean) => void } {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
  let i = 0
  let showCancelHint = false
  process.stdout.write(c.cyan + c.bold + "  qai  " + c.reset + c.dim)
  const id = setInterval(() => {
    const hint = showCancelHint ? c.yellow + " (press ESC to cancel)" + c.reset + c.dim : ""
    process.stdout.write(`\r  qai  ${c.reset}${c.dim}${frames[i++ % frames.length]} thinking...${hint}${c.reset}`)
  }, 80)
  return {
    stop: () => {
      clearInterval(id)
      process.stdout.write(`\r  qai  › ${c.reset}`)
    },
    setCancelHint: (show: boolean) => {
      showCancelHint = show
    },
  }
}

export function errorLine(msg: string) {
  console.log(c.red + "  err  " + c.reset + c.dim + msg + c.reset)
}

export function infoLine(msg: string) {
  console.log(c.yellow + "  inf  " + c.reset + c.dim + msg + c.reset)
}
