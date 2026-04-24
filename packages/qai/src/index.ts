import { serve } from "./server/server"
import { log } from "./util/log"

async function main() {
  log.info("QAI starting...")
  await serve()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
