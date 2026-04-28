import type { CoreMessage } from "ai"

const TOKEN_ESTIMATION_RATIOS: Record<string, number> = {
  anthropic: 0.75,
  openai: 4,
  google: 4,
  groq: 4,
  mistral: 4,
  nvidia: 4,
}

export function estimateTokens(text: string, providerID: string): number {
  const chars = text.length
  const ratio = TOKEN_ESTIMATION_RATIOS[providerID] ?? 4
  return Math.ceil(chars / ratio)
}

export function countMessageTokens(msg: CoreMessage, providerID: string): number {
  if (typeof msg.content === "string") {
    return estimateTokens(msg.content, providerID)
  }

  let tokens = 4
  for (const part of msg.content) {
    if (part.type === "text") {
      tokens += estimateTokens(part.text, providerID)
    } else if (part.type === "tool-call" || part.type === "tool-result") {
      tokens += 50
    }
  }
  return tokens
}

export function countContextTokens(
  messages: CoreMessage[],
  systemPrompt: string,
  currentPrompt: string,
  providerID: string,
): number {
  let total = estimateTokens(systemPrompt, providerID)
  total += estimateTokens(currentPrompt, providerID)

  for (const msg of messages) {
    total += countMessageTokens(msg, providerID)
  }

  return total
}

export interface TruncationResult {
  messages: CoreMessage[]
  droppedCount: number
  wasTruncated: boolean
}

export function truncateMessages(
  messages: CoreMessage[],
  maxTokens: number,
  providerID: string,
  systemPrompt = "",
): TruncationResult {
  // Ensure maxTokens is never negative or too small
  const safeMaxTokens = Math.max(maxTokens, 1000)

  if (messages.length === 0) {
    return { messages: [], droppedCount: 0, wasTruncated: false }
  }

  let totalTokens = estimateTokens(systemPrompt, providerID)
  const messageTokens: number[] = []

  for (const msg of messages) {
    const tokens = countMessageTokens(msg, providerID)
    messageTokens.push(tokens)
    totalTokens += tokens
  }

  if (totalTokens <= safeMaxTokens) {
    return { messages, droppedCount: 0, wasTruncated: false }
  }

  const keptMessages: CoreMessage[] = []
  let currentTokens = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    if (currentTokens + messageTokens[i] <= safeMaxTokens) {
      keptMessages.unshift(messages[i])
      currentTokens += messageTokens[i]
    }
  }

  const droppedCount = messages.length - keptMessages.length
  return {
    messages: keptMessages,
    droppedCount,
    wasTruncated: droppedCount > 0,
  }
}

export const DEFAULT_TOKEN_LIMITS: Record<string, number> = {
  anthropic: 180000,
  openai: 120000,
  google: 120000,
  groq: 32000,
  mistral: 120000,
  nvidia: 120000,
}
