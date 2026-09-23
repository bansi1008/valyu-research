import type { Task } from '../types/task'

const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export class ApiError extends Error {
  statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) msg = body.error
    } catch {}
    throw new ApiError(msg, res.status)
  }

  return res.json() as Promise<T>
}

export async function createTask(question: string, searchType: string = 'all'): Promise<{ taskId: string }> {
  return request<{ taskId: string }>('/api/create-task', {
    method: 'POST',
    body: JSON.stringify({ question, searchType }),
  })
}

export async function fetchTask(taskId: string): Promise<Task> {
  const data = await request<{ task: Task }>(`/api/task/${taskId}`)
  return data.task
}

export async function requestPodcast(taskId: string): Promise<{ taskId: string; podcast: import('../types/task').PodcastInfo }> {
  return request<{ taskId: string; podcast: import('../types/task').PodcastInfo }>(`/api/task/${taskId}/podcast`, {
    method: 'POST',
  })
}
