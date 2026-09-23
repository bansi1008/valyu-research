import { useEffect, useRef, useState, useCallback } from 'react'
import { fetchTask } from '../api/client'
import type { Task, TaskStatus } from '../types/task'

const TERMINAL: TaskStatus[] = ['completed', 'failed']
const ACTIVE_PODCAST: string[] = ['queued', 'generating_script', 'generating_audio']
const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export function useTaskPolling(taskId: string | null) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const connectSSE = useCallback((id: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    const url = `${API_BASE}/api/task/${id}/events`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const taskData = JSON.parse(event.data) as Task
        setTask(taskData)
        setError(null)
        setLoading(false)

        const isResearchDone = TERMINAL.includes(taskData.status)
        const isPodcastActive = taskData.podcast && ACTIVE_PODCAST.includes(taskData.podcast.status)

        if (isResearchDone && !isPodcastActive) {
          es.close()
          eventSourceRef.current = null
        }
      } catch {}
    }

    es.onerror = () => {
      fetchTask(id)
        .then((fallback) => {
          setTask(fallback)
          const isResearchDone = TERMINAL.includes(fallback.status)
          const isPodcastActive = fallback.podcast && ACTIVE_PODCAST.includes(fallback.podcast.status)
          if (isResearchDone && !isPodcastActive && eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
          }
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : 'Stream disconnected')
        })
    }
  }, [])

  useEffect(() => {
    if (!taskId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setTask(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setTask(null)
    setError(null)

    connectSSE(taskId)
    fetchTask(taskId)
      .then((initialTask) => {
        setTask((prev) => prev ?? initialTask)
        setLoading(false)
        const isResearchDone = TERMINAL.includes(initialTask.status)
        const isPodcastActive = initialTask.podcast && ACTIVE_PODCAST.includes(initialTask.podcast.status)
        if (isResearchDone && !isPodcastActive && eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }
      })
      .catch(() => {
        setLoading(false)
      })

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [taskId, connectSSE])

  const reconnect = useCallback(() => {
    if (taskId) {
      connectSSE(taskId)
    }
  }, [taskId, connectSSE])

  return { task, setTask, loading, error, reconnectSSE: reconnect }
}

