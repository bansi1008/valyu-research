export type TaskStatus =
  | "queued"
  | "planning"
  | "searching"
  | "evidence_review"
  | "synthesising"
  | "validating"
  | "completed"
  | "failed";

export type PodcastStatus =
  | "queued"
  | "generating_script"
  | "generating_audio"
  | "completed"
  | "failed";

export interface PodcastCost {
  script: number;
  tts: number;
  total: number;
}

export interface PodcastInfo {
  status: PodcastStatus;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  cost?: PodcastCost | null;
  error?: string | null;
}

export interface Task {
  id: string;
  question: string;
  status: TaskStatus;
  progress: number;
  currentStage: TaskStatus;
  error?: string;
  report?: string;
  sources?: string[];
  podcast?: PodcastInfo;
  createdAt: Date;
  updatedAt: Date;
}
