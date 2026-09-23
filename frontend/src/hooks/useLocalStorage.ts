import { useState, useCallback } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue((current) => {
          const next = value instanceof Function ? value(current) : value
          try {
            window.localStorage.setItem(key, JSON.stringify(next))
          } catch (e) {
            console.warn('[useLocalStorage] write failed:', e)
          }
          return next
        })
      } catch (err) {
        console.warn('[useLocalStorage] set failed:', err)
      }
    },
    [key],
  )

  return [storedValue, setValue] as const
}
