import * as path from "path"

export type AgentID = string

export type AgentDef = {
  id: AgentID
  name: string
  description: string
  tools: string[]
  systemPrompt: string
}

const AGENTS_DIR = path.join(import.meta.dir, "agents")

function parseMd(id: string, content: string): AgentDef {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`Invalid agent file: ${id}.md`)

  const front = Object.fromEntries(
    match[1].split("\n").map(l => l.split(": ").map(s => s.trim()))
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
  const glob = new Bun.Glob("*.md")
  const agents: Record<AgentID, AgentDef> = {}

  for await (const file of glob.scan({ cwd: AGENTS_DIR })) {
    const id = file.replace(/\.md$/, "")
    const content = await Bun.file(path.join(AGENTS_DIR, file)).text()
    agents[id] = parseMd(id, content)
  }

  return agents
}

export const DEFAULT_AGENT: AgentID = "dev"
