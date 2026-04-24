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

export function printLogo(providerID: string, modelID: string) {
  console.clear()
  console.log(c.cyan + c.bold + LOGO + c.reset)
  console.log(c.gray + "  AI coding agent" + c.reset)
  console.log(c.gray + "  ─────────────────────────────────────" + c.reset)
  console.log(c.gray + `  provider  ` + c.white + providerID + c.reset)
  console.log(c.gray + `  model     ` + c.white + modelID + c.reset)
  console.log(c.gray + "  ─────────────────────────────────────" + c.reset)
  console.log()
  console.log(c.dim + "  Type your message and press Enter. Type 'exit' to quit." + c.reset)
  console.log(c.dim + "  Commands: /help  /provider  /model <id>  /clear" + c.reset)
  console.log()
}

export function userPrompt() {
  process.stdout.write(c.green + c.bold + "  you  " + c.reset + c.white + "› " + c.reset)
}

export function agentPrefix() {
  process.stdout.write(c.cyan + c.bold + "  qai  " + c.reset + c.gray + "› " + c.reset)
}

export function errorLine(msg: string) {
  console.log(c.red + "  err  " + c.reset + c.dim + msg + c.reset)
}

export function infoLine(msg: string) {
  console.log(c.yellow + "  inf  " + c.reset + c.dim + msg + c.reset)
}
