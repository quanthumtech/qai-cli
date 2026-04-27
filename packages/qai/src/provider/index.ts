import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createMistral } from "@ai-sdk/mistral"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModelV1 } from "ai"
import { Config } from "../config/index"

export type ProviderID = "anthropic" | "openai" | "google" | "groq" | "mistral" | "nvidia" | string

export interface ModelRef {
  providerID: ProviderID
  modelID: string
}

// Env var names per provider
const ENV_KEYS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  groq: "GROQ_API_KEY",
  mistral: "MISTRAL_API_KEY",
  nvidia: "NVIDIA_API_KEY",
}

export const DEFAULTS: Record<string, string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o",
  google: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-large-latest",
  nvidia: "meta/llama-3.1-70b-instruct",
}

async function resolveKey(providerID: string): Promise<string | undefined> {
  // 1. config file
  const cfg = await Config.getProvider(providerID)
  if (cfg?.apiKey) return cfg.apiKey
  // 2. env var
  const envKey = ENV_KEYS[providerID]
  if (envKey) return process.env[envKey]
  return undefined
}

async function resolveBaseURL(providerID: string): Promise<string | undefined> {
  const cfg = await Config.getProvider(providerID)
  return cfg?.baseURL
}

const STATIC_MODELS: Record<string, string[]> = {
  anthropic: [
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-3-5",
    "claude-opus-4",
    "claude-sonnet-4",
  ],
  google: [
    "gemini-2.5-pro-preview-05-06",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ],
}

export async function listModels(providerID: string): Promise<string[]> {
  if (STATIC_MODELS[providerID]) return STATIC_MODELS[providerID]

  const key = await resolveKey(providerID)
  if (!key) return []

  const cfg = await Config.getProvider(providerID)
  const baseURLs: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    groq: "https://api.groq.com/openai/v1",
    mistral: "https://api.mistral.ai/v1",
    nvidia: "https://integrate.api.nvidia.com/v1",
  }
  const base = cfg?.baseURL ?? baseURLs[providerID]
  if (!base) return []

  try {
    const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } })
    if (!res.ok) return []
    const json = await res.json() as { data: { id: string }[] }
    return json.data.map(m => m.id).sort()
  } catch {
    return []
  }
}

export async function getModel(ref: ModelRef): Promise<LanguageModelV1> {
  const key = await resolveKey(ref.providerID)
  const baseURL = await resolveBaseURL(ref.providerID)

  switch (ref.providerID) {
    case "anthropic": {
      if (!key) throw new Error("No API key for anthropic. Run: qai provider set anthropic --key <key>")
      return createAnthropic({ apiKey: key })(ref.modelID) as LanguageModelV1
    }
    case "openai": {
      if (!key) throw new Error("No API key for openai. Run: qai provider set openai --key <key>")
      return createOpenAI({ apiKey: key, baseURL })(ref.modelID) as LanguageModelV1
    }
    case "google": {
      if (!key) throw new Error("No API key for google. Run: qai provider set google --key <key>")
      return createGoogleGenerativeAI({ apiKey: key })(ref.modelID) as LanguageModelV1
    }
    case "groq": {
      if (!key) throw new Error("No API key for groq. Run: qai provider set groq --key <key>")
      return createGroq({ apiKey: key })(ref.modelID) as LanguageModelV1
    }
    case "mistral": {
      if (!key) throw new Error("No API key for mistral. Run: qai provider set mistral --key <key>")
      return createMistral({ apiKey: key })(ref.modelID) as LanguageModelV1
    }
    case "nvidia": {
      if (!key) throw new Error("No API key for nvidia. Run: qai provider set nvidia --key <key>")
      return createOpenAICompatible({
        name: "nvidia",
        apiKey: key,
        baseURL: baseURL ?? "https://integrate.api.nvidia.com/v1",
      })(ref.modelID) as LanguageModelV1
    }
    default: {
      // Generic OpenAI-compatible provider
      if (!key) throw new Error(`No API key for ${ref.providerID}. Run: qai provider set ${ref.providerID} --key <key>`)
      if (!baseURL) throw new Error(`No baseURL for ${ref.providerID}. Run: qai provider set ${ref.providerID} --base-url <url>`)
      return createOpenAICompatible({
        name: ref.providerID,
        apiKey: key,
        baseURL,
      })(ref.modelID) as LanguageModelV1
    }
  }
}
