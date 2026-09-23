import express from "express";
import { resolve } from "node:path";
import { db } from "./dbconfig/db.js";
import taskRoutes from "./routes/task/index.js";
import "dotenv/config";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

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
app.use("/", taskRoutes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
