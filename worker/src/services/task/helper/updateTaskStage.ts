import type { DocumentReference } from "@google-cloud/firestore";
import type { TaskCost } from "../../../utils/cost.js";

export type TaskStage =
  | "queued"
  | "running"
  | "planning"
  | "searching"
  | "evidence_review"
  | "synthesising"
  | "validating"
  | "completed"
  | "failed";

export interface ReasoningItem {
  question: string;
  purpose: string;
  sources: Array<{
    title: string;
    url: string;
  }>;
}

export interface StageUpdateOptions {
  progress?: number;
  report?: string;
  citations?: Array<{ number: number; title: string; url: string }>;
  cost?: TaskCost;
  reasoning?: ReasoningItem[];
  error?: string;
  [key: string]: unknown;
}

const DEFAULT_STAGE_PROGRESS: Record<TaskStage, number> = {
  queued: 0,
  running: 5,
  planning: 20,
  searching: 45,
  evidence_review: 65,
  synthesising: 85,
  validating: 90,
  completed: 100,
  failed: 100,
};

export async function updateTaskStage(
  taskRef: DocumentReference,
  stage: TaskStage,
  options?: StageUpdateOptions,
): Promise<void> {
  const isTerminal = stage === "completed" || stage === "failed";
  const progress = options?.progress ?? DEFAULT_STAGE_PROGRESS[stage] ?? 0;

  const updateData: Record<string, unknown> = {
    status: isTerminal ? stage : "running",
    updatedAt: new Date(),
    ...options,
  };

  if (stage !== "failed") {
    updateData.currentStage = stage;
    updateData.progress = progress;
  }

  await taskRef.update(updateData);
}
