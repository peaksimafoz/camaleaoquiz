import 'server-only'
import { adminClient } from '@/lib/supabase/admin'
import type { PublicQuiz, Quiz, Question, Result } from '@/types'

// Busca um quiz ATIVO pelo slug, com perguntas e resultados ordenados.
// Usa service role (adminClient) porque roda para visitantes anônimos.
// Retorna null se o quiz não existir ou estiver em rascunho.
export async function getPublicQuiz(slug: string): Promise<PublicQuiz | null> {
  const sb = adminClient()

  const { data: quiz } = await sb
    .from('quizzes')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  if (!quiz) return null

  const [{ data: questions }, { data: results }] = await Promise.all([
    sb
      .from('questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('order', { ascending: true }),
    sb
      .from('results')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('order', { ascending: true }),
  ])

  return {
    quiz: quiz as Quiz,
    questions: (questions ?? []) as Question[],
    results: (results ?? []) as Result[],
  }
}
