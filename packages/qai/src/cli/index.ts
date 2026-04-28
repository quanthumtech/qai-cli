import * as readline from "readline"
import { Session } from "../session/index"
import { Config } from "../config/index"
import { DEFAULTS, type ProviderID, listModels } from "../provider/index"
import {
  printLogo,
  userPrompt,
  statusBar,
  startSpinner,
  errorLine,
  infoLine,
  renderMarkdown,
  selectMenu,
  COLORS as c,
} from "./ui"
import { loadAgents, type AgentID } from "../agent/agents"

const COMMANDS = [
  "/help",
  "/agents",
  "/agents dev",
  "/agents architect",
  "/provider",
  "/provider list",
  "/provider set",
  "/provider default",
  "/provider remove",
  "/connect",
  "/model",
  "/model list",
  "/model set",
  "/clear",
  "exit",
]

async function prompt(rl: readline.Interface, draw: () => void, abortController?: AbortController): Promise<string> {
  const status = statusBar()
  process.stdout.write(
    "\r\x1b[J" + (status ? status + "\n" : "") + c.green + c.bold + "  you  " + c.reset + c.white + "› " + c.reset,
  )
  return new Promise((resolve) => {
    const handler = (input: string) => {
      rl.removeListener("line", handler)
      resolve(input)
    }
    rl.on("line", handler)
  })
}

async function handleProviderCmd(args: string[]) {
  const sub = args[0]
  if (sub === "list") {
    const config = await Config.load()
    const entries = Object.entries(config.providers)
    if (!entries.length) {
      infoLine("No providers configured.")
      return
    }
    for (const [id, cfg] of entries) {
      const key = cfg.apiKey ? `${cfg.apiKey.slice(0, 12)}...` : "(from env)"
      infoLine(`${id}: key=${key}${cfg.baseURL ? ` baseURL=${cfg.baseURL}` : ""}`)
    }
    return
  }
  if (sub === "set") {
    const id = args[1]
    if (!id) {
      errorLine("Usage: qai provider set <id> --key <key> [--base-url <url>]")
      return
    }
    const keyIdx = args.indexOf("--key")
    const urlIdx = args.indexOf("--base-url")
    await Config.setProvider(id, {
      apiKey: keyIdx !== -1 ? args[keyIdx + 1] : undefined,
      baseURL: urlIdx !== -1 ? args[urlIdx + 1] : undefined,
      enabled: true,
    })
    infoLine(`Provider '${id}' saved to ${Config.path}`)
    infoLine(`Set as default: /provider default ${id}`)
    return
  }
  if (sub === "remove") {
    const id = args[1]
    if (!id) {
      errorLine("Usage: qai provider remove <id>")
      return
    }
    await Config.removeProvider(id)
    infoLine(`Provider '${id}' removed.`)
    return
  }
  if (sub === "default") {
    const id = args[1]
    if (!id) {
      errorLine("Usage: qai provider default <id> [model]")
      return
    }
    const model = args[2]
    await Config.setDefault(id, model)
    infoLine(`Default provider set to '${id}'${model ? ` with model '${model}'` : ""}.`)
    infoLine(`Now you can just run: qai`)
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

  if (cmd === "update") {
    const isWindows = process.platform === "win32"
    const script = isWindows
      ? `irm 'https://raw.githubusercontent.com/quanthumtech/qai-cli/main/install.ps1' | iex`
      : `curl -fsSL https://raw.githubusercontent.com/quanthumtech/qai-cli/main/install.sh | sh`
    console.log(c.cyan + "Updating qai..." + c.reset)
    const proc = isWindows
      ? Bun.spawnSync(["powershell", "-Command", script], { stdout: "inherit", stderr: "inherit" })
      : Bun.spawnSync(["sh", "-c", script], { stdout: "inherit", stderr: "inherit" })
    if (proc.exitCode !== 0) process.exit(proc.exitCode ?? 1)
    return
  }

  if (cmd === "uninstall") {
    const isWindows = process.platform === "win32"
    const self = process.execPath

    if (isWindows) {
      const dir = self.replace(/\\qai\.exe$/, "")
      console.log(c.yellow + "Uninstalling qai..." + c.reset)
      Bun.spawnSync(["powershell", "-Command", `Remove-Item -Force "${self}"`], {
        stdout: "inherit",
        stderr: "inherit",
      })
      console.log(c.dim + `Removed ${self}` + c.reset)
      console.log(c.dim + `You may also remove ${dir} and update your PATH manually.` + c.reset)
    } else {
      console.log(c.yellow + "Uninstalling qai..." + c.reset)
      Bun.spawnSync(["sh", "-c", `rm -f "${self}"`], { stdout: "inherit", stderr: "inherit" })
      console.log(c.dim + `Removed ${self}` + c.reset)
      console.log(c.dim + "Config kept at ~/.qai — remove manually if desired." + c.reset)
    }
    return
  }

  if (cmd === "--help" || cmd === "-h") {
    console.log(`
${c.cyan}${c.bold}QAI${c.reset} — AI coding agent

${c.bold}Usage:${c.reset}
  qai                                    Interactive chat
  qai update                             Update to latest version
  qai uninstall                          Remove qai from the system
  qai serve                              HTTP server (port 4096)
  qai provider list                      List configured providers
  qai provider default <id> [model]      Set default provider (and model)
  qai provider set <id> --key <key>      Configure a provider
  qai provider remove <id>               Remove a provider

${c.bold}Providers:${c.reset}  anthropic · openai · google · groq · mistral · nvidia
${c.bold}Env vars:${c.reset}   QAI_PROVIDER · QAI_MODEL · ANTHROPIC_API_KEY · GROQ_API_KEY …
`)
    return
  }

  // Interactive chat
  const config = await Config.load()

  // Auto-detect provider: if defaultProvider has no key configured but another does, use that one
  let providerID = (process.env.QAI_PROVIDER ?? config.defaultProvider) as ProviderID
  if (!process.env.QAI_PROVIDER) {
    const hasKey = (id: string) =>
      !!(
        config.providers[id]?.apiKey ||
        process.env[
          (
            {
              anthropic: "ANTHROPIC_API_KEY",
              openai: "OPENAI_API_KEY",
              google: "GOOGLE_GENERATIVE_AI_API_KEY",
              groq: "GROQ_API_KEY",
              mistral: "MISTRAL_API_KEY",
              nvidia: "NVIDIA_API_KEY",
            } as Record<string, string>
          )[id]
        ]
      )
    if (!hasKey(providerID)) {
      const configured = Object.keys(config.providers).find((id) => config.providers[id]?.apiKey)
      if (configured) providerID = configured as ProviderID
    }
  }

  let modelID = process.env.QAI_MODEL ?? config.defaultModel ?? DEFAULTS[providerID] ?? "gpt-4o"

  const session = await Session.create({ cwd: process.cwd(), model: { providerID, modelID } })

  printLogo(providerID, modelID, session.agentID)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    completer: (line: string) => {
      if (!line.startsWith("/")) return [[], line]
      const hits = COMMANDS.filter((c) => c.startsWith(line))
      return [hits.length ? hits : [], line]
    },
  })

  let currentAbortController: AbortController | undefined = undefined
  type SpinnerType = { stop: () => void; setCancelHint: (show: boolean) => void }
  let currentSpinner: SpinnerType | undefined = undefined
  let isProcessing = false
  let lastEscTimeGlobal = 0
  let pendingCancel = false

  const globalKeyHandler = (str: string, key: { name?: string; ctrl?: boolean; meta?: boolean }) => {
    if (key.name === "escape" && isProcessing) {
      const now = Date.now()
      if (pendingCancel || now - lastEscTimeGlobal < 500) {
        currentAbortController?.abort()
        pendingCancel = false
        currentSpinner && (currentSpinner as SpinnerType).setCancelHint(false)
      } else {
        pendingCancel = true
        currentSpinner && (currentSpinner as SpinnerType).setCancelHint(true)
        setTimeout(() => {
          pendingCancel = false
          currentSpinner && (currentSpinner as SpinnerType).setCancelHint(false)
        }, 1500)
      }
      lastEscTimeGlobal = now
    }
  }

  process.stdin.on("keypress", globalKeyHandler)

  const setRawModeForAbort = () => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
      process.stdin.resume()
    }
  }

  while (true) {
    const input = (await prompt(rl, userPrompt, currentAbortController)).trim()
    if (!input) continue
    if (input === "exit" || input === "/exit") break
    if (input === "/abort") {
      if (currentAbortController) currentAbortController.abort()
      printLogo(providerID, modelID, session.agentID)
      continue
    }

    // Slash commands
    if (input === "/help") {
      infoLine("Commands: /help  /agents  /provider  /model <providerID/modelID>  /clear  exit")
      console.log()
      continue
    }
    if (input === "/agents") {
      const agents = await loadAgents()
      for (const agent of Object.values(agents)) {
        const active = session.agentID === agent.id ? c.cyan + " ◀" + c.reset : ""
        infoLine(`${c.bold}${agent.name}${c.reset}${c.dim}  ${agent.description}${c.reset}${active}`)
        infoLine(`  switch: /agents ${agent.id}`)
      }
      console.log()
      continue
    }
    if (input.startsWith("/agents ")) {
      const id = input.slice(8).trim() as AgentID
      const agents = await loadAgents()
      if (!agents[id]) {
        errorLine(`Unknown agent '${id}'. Available: ${Object.keys(agents).join(", ")}`)
      } else {
        session.agentID = id
        printLogo(providerID, modelID, id)
      }
      console.log()
      continue
    }
    if (input === "/clear") {
      await Session.clearMessages(session.id)
      printLogo(providerID, modelID, session.agentID)
      continue
    }
    if (input === "/connect") {
      const providers = [
        { id: "anthropic", name: "Anthropic (Claude)", defaultModel: "claude-sonnet-4-5" },
        { id: "openai", name: "OpenAI (GPT)", defaultModel: "gpt-4o" },
        { id: "google", name: "Google (Gemini)", defaultModel: "gemini-2.0-flash" },
        { id: "groq", name: "Groq", defaultModel: "llama-3.3-70b-versatile" },
        { id: "mistral", name: "Mistral", defaultModel: "mistral-large-latest" },
        { id: "nvidia", name: "NVIDIA", defaultModel: "meta/llama-3.1-70b-instruct" },
      ]
      console.log()
      infoLine("Available providers:")
      console.log()
      for (const p of providers) {
        console.log(`  ${c.cyan}${p.id}${c.reset}  - ${p.name}`)
      }
      console.log()
      infoLine("Usage: /connect <provider> <api-key>")
      console.log(`  Example: ${c.dim}/connect anthropic sk-ant-...${c.reset}`)
      console.log()
      continue
    }
    if (input.startsWith("/connect ")) {
      const args = input.slice(9).trim().split(" ")
      const provider = args[0]
      const apiKey = args.slice(1).join(" ")
      if (!provider || !apiKey) {
        errorLine("Usage: /connect <provider> <api-key>")
        console.log()
        continue
      }
      await Config.setProvider(provider, { apiKey, enabled: true })
      await Config.setDefault(provider)
      const newConfig = await Config.load()
      providerID = provider as ProviderID
      modelID = newConfig.defaultModel ?? DEFAULTS[providerID] ?? "gpt-4o"
      session.model.providerID = providerID
      session.model.modelID = modelID
      infoLine(`Connected to ${provider}!`)
      printLogo(providerID, modelID, session.agentID)
      console.log()
      continue
    }
    if (input === "/provider") {
      await handleProviderCmd(["list"])
      console.log()
      continue
    }
    if (input.startsWith("/provider ")) {
      const parts = input.slice(10).split(" ")
      await handleProviderCmd(parts)
      // reload session if provider changed
      if (parts[0] === "set" || parts[0] === "default") {
        const newConfig = await Config.load()
        providerID = (newConfig.defaultProvider ?? parts[1]) as ProviderID
        modelID = newConfig.defaultModel ?? DEFAULTS[providerID] ?? "gpt-4o"
        session.model.providerID = providerID
        session.model.modelID = modelID
      }
      console.log()
      continue
    }
    if (input === "/model" || input === "/model list" || input.startsWith("/model list ")) {
      const filter = input.startsWith("/model list ") ? input.slice(12).toLowerCase() : ""
      const spinner = startSpinner()
      const allModels = await listModels(providerID)
      spinner.stop()
      if (!allModels.length) {
        infoLine("Could not fetch model list. Use: /model <providerID/modelID>")
      } else {
        const models = filter ? allModels.filter((m) => m.toLowerCase().includes(filter)) : allModels
        if (!models.length) {
          infoLine(`No models matching "${filter}".`)
        } else {
          infoLine(`current: ${providerID}/${modelID} — use ↑↓ to select, Enter to confirm, Esc to cancel`)
          rl.pause()
          const selected = await selectMenu(models, modelID)
          rl.resume()
          if (selected && selected !== modelID) {
            session.model.modelID = selected
            modelID = selected
            await Config.setDefault(providerID, modelID)
            printLogo(providerID, modelID, session.agentID)
          }
        }
      }
      console.log()
      continue
    }
    if (input.startsWith("/model ")) {
      const [pid, mid] = input.slice(7).split("/")
      if (mid) {
        session.model.providerID = pid as ProviderID
        session.model.modelID = mid
        infoLine(`Switched to ${pid}/${mid}`)
      } else {
        infoLine(`Restart with: QAI_PROVIDER=${pid} qai`)
      }
      console.log()
      continue
    }
    const spinner = startSpinner()
    currentSpinner = spinner
    currentAbortController = new AbortController()
    isProcessing = true
    if (!process.stdin.isTTY) {
      process.stdin.unref()
    }
    setRawModeForAbort()

    try {
      const reply = await Session.chat(session.id, input, { abortSignal: currentAbortController.signal })
      spinner.stop()
      currentSpinner = undefined
      isProcessing = false
      pendingCancel = false
      const output = await renderMarkdown(reply.content)
      console.log(output)
    } catch (err: any) {
      spinner.stop()
      currentSpinner = undefined
      isProcessing = false
      pendingCancel = false
      if (err.name === "AbortError" || err.message?.includes("abort")) {
        printLogo(providerID, modelID, session.agentID)
        continue
      }
      console.log()
      const msg = err.message ?? String(err)
      errorLine(msg.replace(/^Error:\s*/i, ""))
    }
    console.log()
  }

  rl.close()
  console.log(c.dim + "\n  bye.\n" + c.reset)
}
