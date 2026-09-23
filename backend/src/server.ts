import express from "express";
import { resolve } from "node:path";
import { db } from "./dbconfig/db.js";
import taskRoutes from "./routes/task/index.js";
import "dotenv/config";

const app = express();

const rootAudioDir = resolve(process.cwd(), "..", "audio");
app.use("/api/audio", express.static(rootAudioDir));

app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await db.collection("tasks").limit(1).get();

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

app.use("/api", taskRoutes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
