'use client'

import type { SaveState } from '@/lib/useAutosave'

// Indicador visual do estado do salvamento automático.
export function SaveBadge({ state }: { state: SaveState }) {
  if (state === 'idle') return null
  const map: Record<Exclude<SaveState, 'idle'>, [string, string]> = {
    saving: ['Salvando…', 'text-slate-400'],
    saved: ['Salvo ✓', 'text-emerald-600'],
    error: ['Erro ao salvar', 'text-red-500'],
  }
  const [label, cls] = map[state]
  return <span className={`text-xs font-medium ${cls}`}>{label}</span>
}
