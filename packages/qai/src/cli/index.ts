import * as readline from "readline"
import { Session } from "../session/index"
import { Config } from "../config/index"
import { DEFAULTS, type ProviderID } from "../provider/index"
import { printLogo, userPrompt, agentPrefix, errorLine, infoLine, COLORS as c } from "./ui"

async function prompt(rl: readline.Interface, draw: () => void): Promise<string> {
  draw()
  return new Promise((resolve) => rl.once("line", resolve))
}

async function handleProviderCmd(args: string[]) {
  const sub = args[0]
  if (sub === "list") {
    const config = await Config.load()
    const entries = Object.entries(config.providers)
    if (!entries.length) { infoLine("No providers configured."); return }
    for (const [id, cfg] of entries) {
      const key = cfg.apiKey ? `${cfg.apiKey.slice(0, 12)}...` : "(from env)"
      infoLine(`${id}: key=${key}${cfg.baseURL ? ` baseURL=${cfg.baseURL}` : ""}`)
    }
    return
  }
  if (sub === "set") {
    const id = args[1]
    if (!id) { errorLine("Usage: qai provider set <id> --key <key> [--base-url <url>]"); return }
    const keyIdx = args.indexOf("--key")
    const urlIdx = args.indexOf("--base-url")
    await Config.setProvider(id, {
      apiKey: keyIdx !== -1 ? args[keyIdx + 1] : undefined,
      baseURL: urlIdx !== -1 ? args[urlIdx + 1] : undefined,
      enabled: true,
    })
    infoLine(`Provider '${id}' saved to ${Config.path}`)
    return
  }
  if (sub === "remove") {
    const id = args[1]
    if (!id) { errorLine("Usage: qai provider remove <id>"); return }
    await Config.removeProvider(id)
    infoLine(`Provider '${id}' removed.`)
    return
  }
  infoLine("Usage: qai provider list | set <id> --key <key> [--base-url <url>] | remove <id>")
}

export async function runCLI() {
  const args = process.argv.slice(2)
  const cmd = args[0]

  if (cmd === "serve") {
    const { serve } = await import("../server/server")
    await serve()
    return
  }

  if (cmd === "provider") {
    await handleProviderCmd(args.slice(1))
    return
  }

  if (cmd === "--help" || cmd === "-h") {
    console.log(`
${c.cyan}${c.bold}QAI${c.reset} — AI coding agent

${c.bold}Usage:${c.reset}
  qai                                    Interactive chat
  qai serve                              HTTP server (port 4096)
  qai provider list                      List configured providers
  qai provider set <id> --key <key>      Configure a provider
  qai provider remove <id>               Remove a provider

${c.bold}Providers:${c.reset}  anthropic · openai · google · groq · mistral · nvidia
${c.bold}Env vars:${c.reset}   QAI_PROVIDER · QAI_MODEL · ANTHROPIC_API_KEY · GROQ_API_KEY …
`)
    return
  }

  // Interactive chat
  const config = await Config.load()
  const providerID = (process.env.QAI_PROVIDER ?? config.defaultProvider) as ProviderID
  const modelID = process.env.QAI_MODEL ?? config.defaultModel ?? DEFAULTS[providerID] ?? "gpt-4o"

  const session = await Session.create({ cwd: process.cwd(), model: { providerID, modelID } })

  printLogo(providerID, modelID)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false })

  while (true) {
    const input = (await prompt(rl, userPrompt)).trim()
    if (!input) continue
    if (input === "exit" || input === "/exit") break

    // Slash commands
    if (input === "/help") {
      infoLine("Commands: /help  /provider  /model <providerID/modelID>  /clear  exit")
      console.log()
      continue
    }
    if (input === "/clear") {
      printLogo(providerID, modelID)
      continue
    }
    if (input === "/provider") {
      await handleProviderCmd(["list"])
      console.log()
      continue
    }
    if (input.startsWith("/model ")) {
      const [pid, mid] = input.slice(7).split("/")
      infoLine(`Restart with: QAI_PROVIDER=${pid} QAI_MODEL=${mid ?? ""} qai`)
      console.log()
      continue
    }

    agentPrefix()
    try {
      const reply = await Session.chat(session.id, input)
      console.log(reply.content)
    } catch (err: any) {
      console.log()
      const msg = err.message ?? String(err)
      errorLine(msg.replace(/^Error:\s*/i, ""))
    }
    console.log()
  }

  rl.close()
  console.log(c.dim + "\n  bye.\n" + c.reset)
}
