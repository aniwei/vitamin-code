import { Server } from "../../server/server"
import { cmd } from "./cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "../../flag/flag"

export const ServeCommand = cmd({
  command: 'serve',
  builder: (yargs) => withNetworkOptions(yargs),
  describe: "starts a headless vitamin server"
}, async (args) => {
  if (!Flag.VITAMIN_SERVER_PASSWORD) {
    console.log("Warning: VITAMIN_SERVER_PASSWORD is not set; server is unsecured.")
  }
  const opts = await resolveNetworkOptions(args)
  const server = Server.listen(opts)
  console.log(`vitamin server listening on http://${server.hostname}:${server.port}`)

  process.nextTick(async () => {
    await server.stop()
  })
})
