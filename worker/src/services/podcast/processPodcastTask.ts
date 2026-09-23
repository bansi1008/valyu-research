import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { db } from "../../dbconfig/db.js";
import { generatePodcastScript } from "./generatePodcastScript.js";
import { synthesizeDialogueAudio } from "./synthesizePodcastAudio.js";
import { roundCost } from "../../utils/cost.js";

const ROOT_AUDIO_DIR = resolve(process.cwd(), "..", "audio");

export async function processPodcastTask(taskId: string): Promise<void> {
  const taskRef = db.collection("tasks").doc(taskId);
  const snapshot = await taskRef.get();

  if (!snapshot.exists) {
    throw new Error(`Task ${taskId} not found`);
  }

  const task = snapshot.data();

  if (!task?.report) {
    throw new Error(`Task ${taskId} has no completed research report`);
  }

  try {
    console.log(`[Podcast] Generating 2-host dialogue script for task ${taskId}...`);

    await taskRef.update({
      "podcast.status": "generating_script",
      updatedAt: new Date(),
    });

    const scriptResult = await generatePodcastScript(task.question, task.report);

    console.log(`[Podcast] Generated ${scriptResult.script.turns.length} dialogue turns (cost: $${scriptResult.cost.toFixed(4)}). Synthesizing audio for both podcasters...`);

    await taskRef.update({
      "podcast.status": "generating_audio",
      updatedAt: new Date(),
    });

    const audioResult = await synthesizeDialogueAudio(scriptResult.script.turns);

    await mkdir(ROOT_AUDIO_DIR, { recursive: true });
    const localFilePath = join(ROOT_AUDIO_DIR, `${taskId}.mp3`);
    await writeFile(localFilePath, audioResult.buffer);
    console.log(`[Podcast] Saved MP3 to root disk folder: ${localFilePath}`);

    const audioUrl = `/api/audio/${taskId}.mp3`;
    const podcastCost = {
      script: scriptResult.cost,
      tts: audioResult.cost,
      total: roundCost(scriptResult.cost + audioResult.cost),
    };

    console.log(`[Podcast] Podcast completed with cost:`, podcastCost);

    await taskRef.update({
      "podcast.status": "completed",
      "podcast.audioUrl": audioUrl,
      "podcast.durationSeconds": audioResult.durationSeconds,
      "podcast.cost": podcastCost,
      "podcast.error": null,
      updatedAt: new Date(),
    });

    console.log(`[Podcast] Task ${taskId} podcast saved to disk and metadata updated in Firestore.`);
  } catch (error) {
    console.error(`[Podcast] Task ${taskId} podcast generation failed:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred during podcast generation.";

    await taskRef.update({
      "podcast.status": "failed",
      "podcast.error": errorMessage,
      updatedAt: new Date(),
    });

    throw error;
  }
}
