import express from "express";
import { getTask } from "./helper/getTask.js";
import { processTask } from "../../services/task/processTask.js";
import { processPodcastTask } from "../../services/podcast/processPodcastTask.js";
import { testResearch } from "../../services/task/testResearch.js";
const router = express.Router();

router.post("/process", async (req, res) => {
  const { taskId, type } = req.body;

  if (!taskId || typeof taskId !== "string") {
    return res.status(400).json({
      error: "taskId is required",
    });
  }
  const task = await getTask(taskId);
  if (!task) {
    return res.status(404).json({
      error: "Task not found",
    });
  }

  if (type === "podcast") {
    if (task.status !== "completed") {
      return res.status(200).json({
        error: "Research task must be completed before generating a podcast",
      });
    }

    if (task.podcast?.status === "completed") {
      return res.status(200).json({
        error: "Podcast is already completed",
      });
    }

    if (
      task.podcast?.status === "generating_script" ||
      task.podcast?.status === "generating_audio"
    ) {
      return res.status(200).json({
        error: "Podcast is already being generated",
      });
    }

    console.log("Received podcast task:", taskId);
    try {
      await processPodcastTask(taskId);
      return res.status(200).json({
        taskId,
        type: "podcast",
      });
    } catch (error) {
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Podcast processing failed",
      });
    }
  }

  if (task.status === "running") {
    return res.status(200).json({
      error: "Task is already running",
    });
  }
  if (task.status === "completed") {
    return res.status(200).json({
      error: "Task is already completed",
    });
  }
  if (task.status === "failed") {
    return res.status(200).json({
      error: "Task has failed",
    });
  }
  console.log("Received task:", taskId);
  try {
    await processTask(taskId);
    return res.status(200).json({
      taskId,
      type: "research",
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Task processing failed",
    });
  }
});

export default router;
