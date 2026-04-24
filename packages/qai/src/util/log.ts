const levels = ["debug", "info", "warn", "error"] as const
type Level = (typeof levels)[number]

function write(level: Level, msg: string, data?: unknown) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`
  if (data !== undefined) console[level === "debug" ? "log" : level](line, data)
  else console[level === "debug" ? "log" : level](line)
}

export const log = {
  debug: (msg: string, data?: unknown) => write("debug", msg, data),
  info: (msg: string, data?: unknown) => write("info", msg, data),
  warn: (msg: string, data?: unknown) => write("warn", msg, data),
  error: (msg: string, data?: unknown) => write("error", msg, data),
}
