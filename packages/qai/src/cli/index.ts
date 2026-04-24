import * as readline from "readline"
import { Session } from "../session"
import type { ModelRef, ProviderID } from "../provider"
import { DEFAULTS } from "../provider"

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve))
}

export async function runCLI() {
  const args = process.argv.slice(2)
  const cmd = args[0]

  if (cmd === "serve") {
    const { serve } = await import("../server/server")
    await serve()
    return
  }

  // Default: interactive chat
  const providerID = (process.env.QAI_PROVIDER ?? "anthropic") as ProviderID
  const modelID = process.env.QAI_MODEL ?? DEFAULTS[providerID]
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
