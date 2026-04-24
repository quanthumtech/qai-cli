import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { LanguageModelV1 } from "ai"

export type ProviderID = "anthropic" | "openai" | "google"

export interface ModelRef {
  providerID: ProviderID
  modelID: string
}

export function getModel(ref: ModelRef): LanguageModelV1 {
  switch (ref.providerID) {
    case "anthropic": {
      const key = process.env.ANTHROPIC_API_KEY
      if (!key) throw new Error("ANTHROPIC_API_KEY not set")
      return createAnthropic({ apiKey: key })(ref.modelID) as LanguageModelV1
    }
    case "openai": {
      const key = process.env.OPENAI_API_KEY
      if (!key) throw new Error("OPENAI_API_KEY not set")
      return createOpenAI({ apiKey: key })(ref.modelID) as LanguageModelV1
    }
    case "google": {
      const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not set")
      return createGoogleGenerativeAI({ apiKey: key })(ref.modelID) as LanguageModelV1
    }
    default:
      throw new Error(`Unknown provider: ${(ref as any).providerID}`)
  }
}

export const DEFAULTS: Record<ProviderID, string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o",
  google: "gemini-2.0-flash",
}
