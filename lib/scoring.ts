import type { Question, Result, Option, ScaleConfig } from '@/types'

// Respostas do lead, indexadas por question.id:
//  - multiple_choice → option.id (string)
//  - scale           → número escolhido
//  - text            → string digitada
export type Answers = Record<string, string | number>

// Soma os pesos de cada categoria conforme as respostas.
export function computeScores(
  questions: Question[],
  answers: Answers
): Record<string, number> {
  const scores: Record<string, number> = {}
  const add = (cat: string, n: number) => {
    scores[cat] = (scores[cat] ?? 0) + n
  }

  for (const q of questions) {
    const answer = answers[q.id]
    if (answer === undefined || answer === null) continue

    if (q.type === 'multiple_choice') {
      const opts = q.options as Option[]
      const chosen = opts.find((o) => o.id === answer)
      if (chosen?.scores) {
        for (const [cat, w] of Object.entries(chosen.scores)) add(cat, w)
      }
    } else if (q.type === 'scale') {
      const cfg = q.options as ScaleConfig
      const value = Number(answer) || 0
      if (cfg.scores_per_point) {
        for (const [cat, w] of Object.entries(cfg.scores_per_point))
          add(cat, value * w)
      }
    }
    // 'text' não pontua
  }

  return scores
}

// Categoria com maior pontuação (empate: a primeira encontrada). null se vazio.
export function winningCategory(scores: Record<string, number>): string | null {
  let best: string | null = null
  let bestVal = -Infinity
  for (const [cat, val] of Object.entries(scores)) {
    if (val > bestVal) {
      bestVal = val
      best = cat
    }
  }
  return best
}

// Escolhe o resultado: avalia por `order`, primeiro que casar vence.
// Condição vazia ({}) é fallback (sempre casa) — por isso deve ficar por último.
export function resolveResult(
  results: Result[],
  scores: Record<string, number>
): Result | null {
  const ordered = [...results].sort((a, b) => a.order - b.order)
  const winner = winningCategory(scores)

  for (const r of ordered) {
    const c = r.score_condition ?? {}

    if (c.winning_category) {
      if (winner === c.winning_category) return r
      continue
    }
    if (c.category) {
      const v = scores[c.category] ?? 0
      const okMin = c.min === undefined || v >= c.min
      const okMax = c.max === undefined || v <= c.max
      if (okMin && okMax) return r
      continue
    }
    // Fallback (sem condição)
    return r
  }

  return ordered.length > 0 ? ordered[ordered.length - 1] : null
}
