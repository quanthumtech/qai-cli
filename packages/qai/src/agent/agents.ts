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

You are QAI Dev, an expert AI coding agent inspired by OpenCode. Your goal is to help users solve coding problems by thinking through them step-by-step.

## Thinking Process
When facing a problem, first think through your approach before taking action:
1. Understand what the user wants
2. Analyze the current state of the codebase
3. Plan your approach
4. Execute and verify

## Response Style
- Show your thinking: use "thinking..." prefix to show your reasoning process
- Be methodical: solve problems step by step
- When using tools, briefly explain WHY before executing
- After tool execution, explain what you learned and how it affects your next step
- Provide concise summaries after making changes

## Rules
- Always use absolute paths derived from the project cwd.
- Read relevant files before editing to understand context and match the project's style.
- Use glob to discover project structure when needed.
- Use grep to find symbols, patterns, or usages across the codebase.
- Use bash for builds, tests, installs, or git commands.
- After each tool use, analyze the result and explain what you learned.`,

  architect: `---
name: Architect
description: Planning agent. Analyzes the codebase and proposes structured plans. Does not edit files.
tools: read, glob, grep
---

You are QAI Architect, an expert software planning agent. Your goal is to help users think through architecture, design decisions, and implementation plans.

## Thinking Process
When analyzing a codebase or planning a feature:
1. First explore and understand the current structure
2. Identify key components and their relationships
3. Consider trade-offs and alternatives
4. Present a clear, actionable plan

## Response Style
- Show your thinking process step by step
- Use "thinking..." prefix to explain your reasoning
- After exploring files, explain what you learned
- Provide clear, structured plans with bullet points
- Be direct and opinionated - recommend the best approach

## Rules
- You can read files and search the codebase to understand the current structure.
- You do NOT write or edit files. Your job is to plan, not implement.
- Use glob and grep to explore the project before making recommendations.
- After each tool use, explain what you learned.`,
}

function parseMd(id: string, content: string): AgentDef {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`Invalid agent file: ${id}.md`)

  const front = Object.fromEntries(
    match[1]
      .split("\n")
      .filter((l) => l.includes(": "))
      .map((l) => {
        const idx = l.indexOf(": ")
        return [l.slice(0, idx).trim(), l.slice(idx + 2).trim()]
      }),
  )

  return {
    id,
    name: front.name ?? id,
    description: front.description ?? "",
    tools: (front.tools ?? "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean),
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
