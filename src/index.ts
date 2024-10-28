import { createClient } from "redis"
import { config } from "dotenv"
import express from "express"
import expressWs from "express-ws"
import EventEmitter from "node:events"
import cors from "cors"

config()

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
const eventEmitter = new EventEmitter()

const pubsub = await createClient({ url: REDIS_URL })
  .on("error", (err: any) => console.log("Redis Client Error", err))
  .on("connect", () => console.log("Connected to Redis"))
  .connect()

const redisClient = await createClient({ url: REDIS_URL })
  .on("error", (err: any) => console.log("Redis Client Error", err))
  .on("connect", () => console.log("Connected to Redis"))
  .connect()

await pubsub.subscribe("events", (message) => {
  eventEmitter.emit("message", message)
})

const app = express()
expressWs(app)

app.use(cors({ origin: "*" }))

const router = express.Router()

router.ws("/ws", (ws) => {
  eventEmitter.on("message", (message) => {
    ws.send(message)
  })
})

router.get("/nfts/:address", async (req, res) => {
  const address = req.params.address
  if (!address) {
    return res.status(400).json({ message: "Address is required" })
  }

  const nfts = await redisClient
    .KEYS(`event:NFTMinted:${address}:*`)
    .then((keys) => Promise.all(keys.map((key) => redisClient.GET(key))))
    .then((nfts) => nfts.map((nft) => (nft ? JSON.parse(nft) : {})))
    .then((nfts) => nfts.sort((a, b) => a?.data?.tokenId - b?.data?.tokenId))

  res.json(nfts)
})

app.use(router)

app.listen(4000, () => {
  console.log("Server started on port 4000")
})
