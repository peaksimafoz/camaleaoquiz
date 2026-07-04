import { createClient } from '@/lib/supabase/client'
import type { Question, Result } from '@/types'

export interface QuizMetrics {
  views: number
  starts: number
  completed: number
  completionRate: number // completed / starts (0..1)
  totalLeads: number
  // Quantos responderam cada pergunta (na ordem) — mostra onde há abandono.
  answeredByQuestion: { questionId: string; text: string; answered: number }[]
  // Distribuição de resultados entre os leads.
  resultDistribution: { resultId: string | null; name: string; count: number }[]
}

async function countEvents(
  quizId: string,
  eventType: string,
  questionId?: string
): Promise<number> {
  const sb = createClient()
  let q = sb
    .from('quiz_events')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('event_type', eventType)
  if (questionId) q = q.eq('question_id', questionId)
  const { count } = await q
  return count ?? 0
}

async function countLeadsByResult(
  quizId: string,
  resultId: string | null
): Promise<number> {
  const sb = createClient()
  const base = sb
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
  const { count } = await (resultId
    ? base.eq('result_id', resultId)
    : base.is('result_id', null))
  return count ?? 0
}

async function countLeads(quizId: string): Promise<number> {
  const sb = createClient()
  const { count } = await sb
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
  return count ?? 0
}

export async function loadMetrics(
  quizId: string,
  questions: Question[],
  results: Result[]
): Promise<QuizMetrics> {
  const [views, starts, completed, totalLeads] = await Promise.all([
    countEvents(quizId, 'view'),
    countEvents(quizId, 'start'),
    countEvents(quizId, 'completed'),
    countLeads(quizId),
  ])

  const answeredByQuestion = await Promise.all(
    questions.map(async (q, i) => ({
      questionId: q.id,
      text: q.text || `Pergunta ${i + 1}`,
      answered: await countEvents(quizId, 'question_answered', q.id),
    }))
  )

  const resultCounts = await Promise.all(
    results.map(async (r) => ({
      resultId: r.id,
      name: r.name || 'Sem nome',
      count: await countLeadsByResult(quizId, r.id),
    }))
  )
  const noResult = await countLeadsByResult(quizId, null)
  const resultDistribution = [
    ...resultCounts,
    ...(noResult > 0
      ? [{ resultId: null, name: 'Sem resultado', count: noResult }]
      : []),
  ]

  return {
    views,
    starts,
    completed,
    completionRate: starts > 0 ? completed / starts : 0,
    totalLeads,
    answeredByQuestion,
    resultDistribution,
  }
}
