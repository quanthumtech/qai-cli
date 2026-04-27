import * as path from "path"
import * as os from "os"

export type AgentID = string

export type AgentDef = {
  id: AgentID
  name: string
  description: string
  tools: string[]
  systemPrompt: string
}

// Built-in agents embedded at compile time
const BUILTIN: Record<string, string> = {
  dev: `---
name: Dev
description: Full-stack coding agent. Reads, writes, edits files and runs commands.
tools: read, write, edit, bash, glob, grep
---

You are QAI Dev, an AI coding agent. You help users implement features, fix bugs, and work with code.

Rules:
- Always use absolute paths derived from the project cwd.
- Read relevant files before editing to understand context and match the project's style.
- Use glob to discover project structure when needed.
- Use grep to find symbols, patterns, or usages across the codebase.
- Use bash for builds, tests, installs, or git commands (never call git as a tool directly).
- Be concise. Don't explain what you're about to do — just do it and summarize what changed.`,

  architect: `---
name: Architect
description: Planning agent. Analyzes the codebase and proposes structured plans. Does not edit files.
tools: read, glob, grep
---

You are QAI Architect, a software planning agent. You help users think through architecture, design decisions, and implementation plans.

Rules:
- You can read files and search the codebase to understand the current structure.
- You do NOT write or edit files. Your job is to plan, not implement.
- Use glob and grep to explore the project before making recommendations.
- Respond with clear, structured plans: bullet points, trade-offs, and step-by-step breakdowns.
- Be direct and opinionated. Recommend the best approach, not a list of options.`,
}

function parseMd(id: string, content: string): AgentDef {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`Invalid agent file: ${id}.md`)

  const front = Object.fromEntries(
    match[1].split("\n").filter(l => l.includes(": ")).map(l => {
      const idx = l.indexOf(": ")
      return [l.slice(0, idx).trim(), l.slice(idx + 2).trim()]
    })
  )

  return {
    id,
    name: front.name ?? id,
    description: front.description ?? "",
    tools: (front.tools ?? "").split(",").map((t: string) => t.trim()).filter(Boolean),
    systemPrompt: match[2].trim(),
  }
}

export async function loadAgents(): Promise<Record<AgentID, AgentDef>> {
  const agents: Record<AgentID, AgentDef> = {}

  // Load built-ins first
  for (const [id, content] of Object.entries(BUILTIN)) {
    agents[id] = parseMd(id, content)
  }

  // Override/extend with user agents from ~/.qai/agents/
  const userDir = path.join(os.homedir(), ".qai", "agents")
  try {
    const glob = new Bun.Glob("*.md")
    for await (const file of glob.scan({ cwd: userDir })) {
      const id = file.replace(/\.md$/, "")
      const content = await Bun.file(path.join(userDir, file)).text()
      agents[id] = parseMd(id, content)
    }
  } catch {
    // ~/.qai/agents/ doesn't exist yet, that's fine
  }

  return agents
}

export const DEFAULT_AGENT: AgentID = "dev"
