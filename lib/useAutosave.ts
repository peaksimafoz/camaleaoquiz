'use client'

import { useEffect, useRef, useState } from 'react'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// Salva `value` automaticamente após `delay` ms sem alterações (debounce).
// Ignora o primeiro render (valor recém-carregado) para não salvar à toa.
export function useAutosave<T>(
  value: T,
  save: (v: T) => Promise<void>,
  delay = 800
): SaveState {
  const [state, setState] = useState<SaveState>('idle')
  const first = useRef(true)
  const saveRef = useRef(save)
  saveRef.current = save
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setState('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        await saveRef.current(value)
        setState('saved')
      } catch {
        setState('error')
      }
    }, delay)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [value, delay])

  return state
}
