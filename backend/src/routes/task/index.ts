import { Router } from "express";
import { createTask } from "./helper/createTask.js";
import { getTask } from "./helper/getTask.js";
import {
  enqueueResearchTask,
  enqueuePodcastTask,
} from "../../services/cloud-tasks.js";
import { db } from "../../dbconfig/db.js";
import type { Task } from "../../types/task.js";

const router = Router();

router.post(["/create-task", "/tasks"], async (req, res) => {
  const { question, searchType } = req.body;

  if (!question || typeof question !== "string") {
    return res.status(400).json({
      error: "question is required",
    });
  }

  const taskId = await createTask(
    question,
    typeof searchType === "string" ? searchType : "all",
  );

  await enqueueResearchTask(taskId);

  return res.status(202).json({
    taskId,
  });
});

router.get(["/task/:id", "/tasks/:id"], async (req, res) => {
  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(400).json({
      error: "Task ID is required",
    });
  }

  const task = await getTask(id);
  if (!task) {
    return res.status(404).json({
      error: "Task not found",
    });
  }
  return res.status(200).json({
    task,
  });
});

router.post("/task/:id/podcast", async (req, res) => {
  const { id } = req.params;
  console.log("Received request to generate podcast for task:", id);
  if (!id || id === "undefined" || typeof id !== "string") {
    return res.status(400).json({
      error: "Task ID is required",
    });
  }

  const taskRef = db.collection("tasks").doc(id);
  const snapshot = await taskRef.get();

  if (!snapshot.exists) {
    return res.status(404).json({
      error: "Task not found",
    });
  }

  const taskData = snapshot.data() as Task | undefined;

  if (!taskData || taskData.status !== "completed") {
    return res.status(400).json({
      error: "Research task must be completed before generating a podcast",
    });
  }

  if (taskData.podcast?.status === "completed") {
    return res.status(200).json({
      taskId: id,
      podcast: taskData.podcast,
      message: "Podcast already exists",
    });
  }

  if (
    taskData.podcast?.status === "queued" ||
    taskData.podcast?.status === "generating_script" ||
    taskData.podcast?.status === "generating_audio"
  ) {
    return res.status(200).json({
      taskId: id,
      podcast: taskData.podcast,
      message: "Podcast is already being generated",
    });
  }

  const initialPodcast = {
    status: "queued",
    audioUrl: null,
    durationSeconds: null,
    error: null,
  };

  await taskRef.update({
    podcast: initialPodcast,
    updatedAt: new Date(),
  });

  await enqueuePodcastTask(id);

  return res.status(202).json({
    taskId: id,
    podcast: initialPodcast,
  });
});

router.get("/task/:id/events", async (req, res) => {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    res.status(400).end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.socket?.setNoDelay(true);
  res.flushHeaders();

  res.write(":" + " ".repeat(2048) + "\n\n");
  res.write(": ping\n\n");

  const taskRef = db.collection("tasks").doc(id);

  let isClosed = false;
  let lastDataJson = "";
  let interval: ReturnType<typeof setInterval> | undefined;

  const checkAndUpdate = async () => {
    if (isClosed) return;
    try {
      const snapshot = await taskRef.get();
      if (!snapshot.exists) {
        res.write(
          `event: error\ndata: ${JSON.stringify({ error: "Task not found" })}\n\n`,
        );
        return;
      }

      const taskData = {
        id: snapshot.id,
        ...snapshot.data(),
      } as Task;

      const currentJson = JSON.stringify(taskData);
      if (currentJson !== lastDataJson) {
        lastDataJson = currentJson;
        console.log(
          `[SSE] Emitted update for task ${id}: status=${taskData.status}, stage=${taskData.currentStage}, progress=${taskData.progress}%`,
        );
        res.write(`data: ${currentJson}\n\n`);
      } else {
        res.write(": keepalive\n\n");
      }

      const isResearchDone =
        taskData.status === "completed" || taskData.status === "failed";
      const isPodcastActive =
        taskData.podcast &&
        (taskData.podcast.status === "queued" ||
          taskData.podcast.status === "generating_script" ||
          taskData.podcast.status === "generating_audio");

      if (isResearchDone && !isPodcastActive) {
        isClosed = true;
        if (interval) clearInterval(interval);
        res.end();
      }
    } catch (err) {
      console.error(`[SSE] Error checking task ${id}:`, err);
    }
  };

  await checkAndUpdate();

  if (!isClosed) {
    interval = setInterval(checkAndUpdate, 1000);
  }

  req.on("close", () => {
    isClosed = true;
    if (interval) clearInterval(interval);
  });
});

export default router;
