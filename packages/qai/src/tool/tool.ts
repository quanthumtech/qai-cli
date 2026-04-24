import { z } from "zod"

export namespace Tool {
  export type Context = {
    sessionID: string
    cwd: string
  }

  export type Definition<TParams extends z.ZodType, TResult = string> = {
    description: string
    parameters: TParams
    execute(params: z.infer<TParams>, ctx: Context): Promise<TResult>
  }

  export type Any = Definition<z.ZodType, any>

  export function define<TParams extends z.ZodType, TResult = string>(
    def: Definition<TParams, TResult>,
  ): Definition<TParams, TResult> {
    return def
  }
}
