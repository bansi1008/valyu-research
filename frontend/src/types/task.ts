export type TaskStatus =
  | 'queued'
  | 'running'
  | 'planning'
  | 'searching'
  | 'evidence_review'
  | 'synthesising'
  | 'validating'
  | 'completed'
  | 'failed'

export interface Citation {
  number: number
  title: string
  url: string
}

export interface TaskCost {
  valyu: number
  openai: number
  jev: number
  total: number
}

export interface ReasoningItem {
  question: string
  purpose: string
  sources: Array<{
    title: string
    url: string
  }>
}

export type PodcastStatus =
  | 'queued'
  | 'generating_script'
  | 'generating_audio'
  | 'completed'
  | 'failed'

export interface PodcastCost {
  script: number
  tts: number
  total: number
}

export interface PodcastInfo {
  status: PodcastStatus
  audioUrl?: string | null
  durationSeconds?: number | null
  cost?: PodcastCost | null
  error?: string | null
}

export type SearchType = 'all' | 'web' | 'proprietary' | 'news'

export interface Task {
  id: string
  question: string
  status: TaskStatus
  progress: number
  currentStage?: TaskStatus
  searchType?: SearchType
  error?: string
  report?: string
  citations?: Citation[]
  cost?: TaskCost
  reasoning?: ReasoningItem[]
  podcast?: PodcastInfo
  createdAt: unknown
  updatedAt: unknown
}

export interface TaskHistoryItem {
  id: string
  question: string
  status: TaskStatus
  searchType?: SearchType
  cost?: TaskCost
  createdAt: string
}

export interface StageInfo {
  label: string
  description: string
  color: string
  bgColor: string
}

export const STAGE_INFO: Record<TaskStatus, StageInfo> = {
  queued: {
    label: 'Queued',
    description: 'Waiting to begin processing',
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.12)',
  },
  running: {
    label: 'Running',
    description: 'Processing your request',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.12)',
  },
  planning: {
    label: 'Planning',
    description: 'Designing a multi-angle research strategy',
    color: '#818cf8',
    bgColor: 'rgba(129, 140, 248, 0.12)',
  },
  searching: {
    label: 'Searching',
    description: 'Querying academic databases & scientific sources',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.12)',
  },
  evidence_review: {
    label: 'Evidence Review',
    description: 'Ranking, deduplicating & selecting best sources',
    color: '#22d3ee',
    bgColor: 'rgba(34, 211, 238, 0.12)',
  },
  synthesising: {
    label: 'Synthesising',
    description: 'Crafting your cited research report',
    color: '#a78bfa',
    bgColor: 'rgba(167, 139, 250, 0.12)',
  },
  validating: {
    label: 'Validating',
    description: 'Verifying citations and cross-checking claims',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.12)',
  },
  completed: {
    label: 'Completed',
    description: 'Research complete — report ready',
    color: '#34d399',
    bgColor: 'rgba(52, 211, 153, 0.12)',
  },
  failed: {
    label: 'Failed',
    description: 'Research could not be completed',
    color: '#f87171',
    bgColor: 'rgba(248, 113, 113, 0.12)',
  },
}

export const PIPELINE_STAGES: TaskStatus[] = [
  'queued',
  'planning',
  'searching',
  'evidence_review',
  'synthesising',
  'validating',
  'completed',
]

export function getEffectiveStage(task: Task): TaskStatus {
  if (task.status === 'running') {
    return task.currentStage ?? 'planning'
  }
  return task.status
}

export function getStageIndex(stage: TaskStatus): number {
  const idx = PIPELINE_STAGES.indexOf(stage)
  return idx === -1 ? 0 : idx
}

export function isTerminal(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed'
}
