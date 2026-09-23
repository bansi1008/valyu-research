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

  const closeSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  const handleTaskUpdate = useCallback(
    (taskData: Task) => {
      setTask(taskData)
      setError(null)
      setLoading(false)

      const isResearchDone = TERMINAL.includes(taskData.status)
      const isPodcastActive = taskData.podcast && ACTIVE_PODCAST.includes(taskData.podcast.status)

      if (isResearchDone && !isPodcastActive) {
        closeSSE()
      }
    },
    [closeSSE],
  )

  const connectSSE = useCallback(
    (id: string) => {
      closeSSE()

      const url = `${API_BASE}/api/task/${id}/events`
      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onmessage = (event) => {
        try {
          const taskData = JSON.parse(event.data) as Task
          handleTaskUpdate(taskData)
        } catch {}
      }

      es.onerror = () => {
        fetchTask(id)
          .then((fallback) => {
            handleTaskUpdate(fallback)
          })
          .catch((e) => {
            setError(e instanceof Error ? e.message : 'Stream disconnected')
          })
      }
    },
    [closeSSE, handleTaskUpdate],
  )

  useEffect(() => {
    if (!taskId) {
      closeSSE()
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
        handleTaskUpdate(initialTask)
      })
      .catch(() => {
        setLoading(false)
      })

    return () => {
      closeSSE()
    }
  }, [taskId, connectSSE, handleTaskUpdate, closeSSE])

  const reconnect = useCallback(() => {
    if (taskId) {
      connectSSE(taskId)
    }
  }, [taskId, connectSSE])

  return { task, setTask, loading, error, reconnectSSE: reconnect }
}

