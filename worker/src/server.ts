import express from "express";
import { resolve } from "node:path";
import "dotenv/config";

import consumerRoutes from "./routes/consumer/index.js";

const app = express();

const rootAudioDir = resolve(process.cwd(), "..", "audio");
app.use("/api/audio", express.static(rootAudioDir));

app.use(express.json());
app.use("/api", consumerRoutes);

app.get("/health", async (_req, res) => {
  try {
    res.json({
      status: "ok",
      firestore: "connected",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      firestore: "disconnected",
    });
  }
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Worker listening on ${port}`);
});
