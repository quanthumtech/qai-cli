import * as readline from "readline"
import { Session } from "../session/index"
import { Config } from "../config/index"
import { DEFAULTS, type ProviderID } from "../provider/index"

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve))
}

async function handleProviderCmd(args: string[]) {
  const sub = args[0]

  if (sub === "list") {
    const config = await Config.load()
    const providers = Object.entries(config.providers)
    if (!providers.length) {
      console.log("No providers configured. Set via env vars or: qai provider set <id> --key <key>")
      return
    }
    for (const [id, cfg] of providers) {
      const key = cfg.apiKey ? `${cfg.apiKey.slice(0, 8)}...` : "(from env)"
      console.log(`  ${id}: key=${key}${cfg.baseURL ? ` baseURL=${cfg.baseURL}` : ""}`)
    }
    return
  }

  if (sub === "set") {
    const id = args[1]
    if (!id) { console.error("Usage: qai provider set <id> [--key <key>] [--base-url <url>]"); return }
    const keyIdx = args.indexOf("--key")
    const urlIdx = args.indexOf("--base-url")
    const apiKey = keyIdx !== -1 ? args[keyIdx + 1] : undefined
    const baseURL = urlIdx !== -1 ? args[urlIdx + 1] : undefined
    await Config.setProvider(id, { apiKey, baseURL, enabled: true })
    console.log(`Provider '${id}' saved to ${Config.path}`)
    return
  }

  if (sub === "remove") {
    const id = args[1]
    if (!id) { console.error("Usage: qai provider remove <id>"); return }
    await Config.removeProvider(id)
    console.log(`Provider '${id}' removed.`)
    return
  }

  console.log(`Usage:
  qai provider list
  qai provider set <id> --key <apiKey> [--base-url <url>]
  qai provider remove <id>

Supported providers: anthropic, openai, google, groq, mistral, nvidia
Any OpenAI-compatible provider: qai provider set <id> --key <key> --base-url <url>`)
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
    console.log(`QAI - AI coding agent

Usage:
  qai                          Interactive chat
  qai serve                    Start HTTP server (port 4096)
  qai provider list            List configured providers
  qai provider set <id> ...    Configure a provider
  qai provider remove <id>     Remove a provider

Environment variables (alternative to 'provider set'):
  ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY
  GROQ_API_KEY, MISTRAL_API_KEY, NVIDIA_API_KEY
  QAI_PROVIDER   (default: anthropic)
  QAI_MODEL      (default: provider's default model)`)
    return
  }

  // Interactive chat
  const config = await Config.load()
  const providerID = (process.env.QAI_PROVIDER ?? config.defaultProvider) as ProviderID
  const modelID = process.env.QAI_MODEL ?? config.defaultModel ?? DEFAULTS[providerID] ?? "gpt-4o"
  const cwd = process.cwd()

  const session = await Session.create({ cwd, model: { providerID, modelID } })

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  console.log(`QAI ready. Model: ${providerID}/${modelID}. Type 'exit' to quit.\n`)

  while (true) {
    const input = (await prompt(rl, "You: ")).trim()
    if (!input || input === "exit") break

    process.stdout.write("QAI: ")
    try {
      const reply = await Session.chat(session.id, input)
      console.log(reply.content)
    } catch (err: any) {
      console.error("Error:", err.message)
    }
    console.log()
  }

  rl.close()
}
