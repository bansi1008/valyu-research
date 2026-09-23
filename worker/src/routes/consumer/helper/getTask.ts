import { db } from "../../../dbconfig/db.js";

export interface PodcastCost {
  script: number;
  tts: number;
  total: number;
}

export interface PodcastInfo {
  status:
    | "queued"
    | "generating_script"
    | "generating_audio"
    | "completed"
    | "failed";
  audioUrl?: string | null;
  durationSeconds?: number | null;
  cost?: PodcastCost | null;
  error?: string | null;
}

export interface TaskDocument {
  id: string;
  question: string;
  status: string;
  progress?: number;
  currentStage?: string;
  report?: string;
  podcast?: PodcastInfo;
  [key: string]: unknown;
}

export async function getTask(taskId: string): Promise<TaskDocument | null> {
  const taskRef = db.collection("tasks").doc(taskId);
  const snapshot = await taskRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...(data as object),
  } as TaskDocument;
}
