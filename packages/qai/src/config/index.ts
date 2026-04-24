import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"
import { z } from "zod"

const CONFIG_DIR = path.join(os.homedir(), ".config", "qai")
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json")

export const ProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  enabled: z.boolean().default(true),
})

export const ConfigSchema = z.object({
  providers: z
    .record(
      z.string(),
      ProviderConfigSchema,
    )
    .default({}),
  defaultProvider: z.string().default("anthropic"),
  defaultModel: z.string().optional(),
})

export type Config = z.infer<typeof ConfigSchema>
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>

let _cache: Config | null = null

export const Config = {
  path: CONFIG_FILE,

  async load(): Promise<Config> {
    if (_cache) return _cache
    try {
      const raw = await fs.readFile(CONFIG_FILE, "utf-8")
      _cache = ConfigSchema.parse(JSON.parse(raw))
    } catch {
      _cache = ConfigSchema.parse({})
    }
    return _cache!
  },

  async save(config: Config): Promise<void> {
    await fs.mkdir(CONFIG_DIR, { recursive: true })
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2))
    _cache = config
  },

  async setProvider(id: string, cfg: ProviderConfig): Promise<void> {
    const config = await Config.load()
    config.providers[id] = cfg
    await Config.save(config)
  },

  async removeProvider(id: string): Promise<void> {
    const config = await Config.load()
    delete config.providers[id]
    await Config.save(config)
  },

  async getProvider(id: string): Promise<ProviderConfig | undefined> {
    const config = await Config.load()
    return config.providers[id]
  },
}
