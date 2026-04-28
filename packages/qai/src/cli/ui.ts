import { Config } from "../config/index"

export const LOGO = `
   ____  ___    ____
  / __ \\/ _ |  /  _/
 / /_/ / __ |_/ /  
 \\____\\_\\/_/ |___/  
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

function processInline(text: string): string {
  text = text.replace(/\*\*(.+?)\*\*/g, c.bold + "$1" + c.reset)
  text = text.replace(/\*(.+?)\*/g, c.dim + "$1" + c.reset)
  text = text.replace(/`([^`]+)`/g, c.yellow + "$1" + c.reset)
  return text
}

function renderHeading(text: string, level: number): string {
  const prefix = "  ".repeat(level - 1)
  const styles = [c.cyan + c.bold, c.cyan, c.cyan + c.bold, c.white, c.white, c.white]
  return styles[level - 1] + prefix + text + c.reset + "\n"
}

function renderCodeBlock(code: string, lang: string): string {
  const lines = code.split("\n")
  if (lines.length === 1) {
    return c.yellow + "  " + lines[0] + c.reset + "\n"
  }

  const maxLen = Math.max(...lines.map((l) => l.length), 30)
  const langStr = lang ? c.cyan + lang + c.reset : c.cyan + "code" + c.reset
  const top = c.dim + "  ┌─ " + langStr + " " + "─".repeat(Math.max(0, maxLen - lang.length)) + "┐" + c.reset
  const bottom = c.dim + "  └" + "─".repeat(maxLen + 3) + "┘" + c.reset

  const content = lines
    .map((line) => {
      const padded = line.padEnd(maxLen)
      return c.dim + "  │ " + c.reset + c.white + padded + c.dim + " │" + c.reset
    })
    .join("\n")

  return top + "\n" + content + "\n" + bottom + "\n"
}

function renderTableSimple(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] || "").length)))

  const headerLine = headers
    .map((h, i) => c.bold + c.cyan + h.padEnd(colWidths[i]) + c.reset)
    .join(c.dim + " │ " + c.reset)

  const sep = c.dim + "  " + colWidths.map((w) => "─".repeat(w)).join(" ─ ") + c.reset

  const dataLines = rows.map((row) =>
    row.map((cell, i) => c.white + (cell || "").padEnd(colWidths[i]) + c.reset).join(c.dim + " │ " + c.reset),
  )

  return (
    c.dim +
    "  ┌─ " +
    c.reset +
    headerLine +
    c.dim +
    " ┐" +
    c.reset +
    "\n" +
    sep +
    "\n" +
    dataLines.map((r) => c.dim + "  │ " + c.reset + r + c.dim + " │" + c.reset).join("\n") +
    "\n" +
    c.dim +
    "  └" +
    "─".repeat(headerLine.length + 3) +
    "┘" +
    c.reset
  )
}

function isTableLine(line: string): boolean {
  return line.includes("│") && (line.includes("┌") || line.includes("├") || line.includes("┬"))
}

function parseTableBlock(lines: string[], startIdx: number): { table: string; endIdx: number } {
  const tableLines: string[] = []
  let i = startIdx

  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) break
    if (!line.includes("│") && !line.includes("┌") && !line.includes("─")) break
    tableLines.push(lines[i])
    i++
  }

  const cleaned = tableLines
    .filter((l) => !l.includes("─") && !l.includes("┬") && !l.includes("┼") && !l.includes("┴"))
    .map((l) => l.replace(/│/g, "|").replace(/\|/g, " | ").replace(/\s+/g, " ").trim())
    .filter(Boolean)

  if (cleaned.length < 2) {
    return { table: lines[startIdx], endIdx: startIdx }
  }

  const headers = cleaned[0]
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
  const rows = cleaned.slice(1).map((row) => row.split("|").map((s) => s.trim()))

  return { table: renderTableSimple(headers, rows), endIdx: i }
}

export async function renderMarkdown(text: string): Promise<string> {
  const lines = text.split("\n")
  const out: string[] = []
  let inCodeBlock = false
  let codeBlockLang = ""
  let codeBlockContent: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeBlockLang = line.slice(3).trim()
        codeBlockContent = []
      } else {
        out.push(renderCodeBlock(codeBlockContent.join("\n"), codeBlockLang))
        inCodeBlock = false
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    if (line.match(/^#{1,6}\s/)) {
      const match = line.match(/^(#{1,6})\s+(.*)/)
      if (match) {
        out.push(renderHeading(match[2], match[1].length))
      }
      continue
    }

    if (line.trim().startsWith("|") && line.includes("─")) {
      const { table, endIdx } = parseTableBlock(lines, i)
      out.push(table)
      i = endIdx - 1
      continue
    }

    if (line.match(/^[-*]\s/)) {
      out.push(c.cyan + "  • " + c.reset + processInline(line.slice(2)))
      continue
    }

    if (line.match(/^\d+\.\s/)) {
      const match = line.match(/^(\d+)\.\s+(.*)/)
      if (match) {
        out.push(c.cyan + "  " + match[1] + ". " + c.reset + processInline(match[2]))
      }
      continue
    }

    if (line.startsWith("> ")) {
      out.push(c.dim + "  │ " + c.reset + c.gray + line.slice(2) + c.reset)
      continue
    }

    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      out.push(c.dim + "  ─────────────────────────" + c.reset)
      continue
    }

    if (line.trim() === "") {
      out.push("")
      continue
    }

    out.push("  " + processInline(line))
  }

  return out.join("\n")
}

export async function selectMenu(items: string[], current: string): Promise<string | null> {
  if (!process.stdin.isTTY) return null

  let idx = Math.max(0, items.indexOf(current))
  const visible = 12

  const draw = () => {
    const start = Math.max(0, Math.min(idx - Math.floor(visible / 2), items.length - visible))
    const slice = items.slice(start, start + visible)
    process.stdout.write("\x1b[?25l")
    slice.forEach((item, i) => {
      const abs = start + i
      const selected = abs === idx
      const marker = selected ? c.bgGray + c.white + c.bold : c.reset + c.dim
      const active = item === current ? c.cyan + " ◀" + c.reset : ""
      process.stdout.write(`\r${marker}  ${item}${c.reset}${active}\x1b[K\n`)
    })
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
        idx = (idx - 1 + items.length) % items.length
        clear(sliceLen)
        draw()
      } else if (key === "\x1b[B" || key === "\x1b[C") {
        idx = (idx + 1) % items.length
        clear(sliceLen)
        draw()
      } else if (key === "\r" || key === "\n") {
        clear(sliceLen)
        process.stdin.removeListener("data", onData)
        process.stdin.setRawMode(false)
        process.stdout.write("\x1b[?25h")
        process.stdin.pause()
        setTimeout(() => resolve(items[idx]), 10)
      } else if (key === "\x03" || key === "\x1b") {
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
  console.log(c.dim + " Commands: /help /doc /agents /providers /connect /model /clear /exit" + c.reset)
  console.log()
}

export function statusBar(): string {
  const cwd = process.cwd()
  const home = process.env.HOME || ""
  const dir = cwd.startsWith(home) ? "~" + cwd.slice(home.length) : cwd

  let branch = ""
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"], { cwd })
    if (result.exitCode === 0) branch = result.stdout.toString().trim()
  } catch {}

  const left = branch ? `${dir}:${branch}` : dir
  return c.gray + c.dim + " " + left + c.reset
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
    const hint = showCancelHint ? c.red + " (ESC to cancel)" + c.reset + c.dim : ""
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

export function successLine(msg: string) {
  console.log(c.green + "  ok   " + c.reset + c.dim + msg + c.reset)
}

export function warningLine(msg: string) {
  console.log(c.yellow + "  warn " + c.reset + c.dim + msg + c.reset)
}
