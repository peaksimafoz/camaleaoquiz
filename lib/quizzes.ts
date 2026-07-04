import { createClient } from '@/lib/supabase/client'
import type { Quiz, Question, Result } from '@/types'

// Camada de acesso a dados do painel admin. Roda no client (componentes 'use
// client') com a sessão do usuário — a policy RLS "auth_all" libera authenticated.
// Erros são lançados para o componente chamador tratar (toast).

function sb() {
  return createClient()
}

// ── Quizzes ──────────────────────────────────────────────────────────────────
export async function listQuizzes(): Promise<Quiz[]> {
  const { data, error } = await sb()
    .from('quizzes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Quiz[]
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  const { data, error } = await sb()
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return (data as Quiz) ?? null
}

export async function createQuiz(input: {
  name: string
  slug: string
  type: Quiz['type']
}): Promise<Quiz> {
  const { data, error } = await sb()
    .from('quizzes')
    .insert({ name: input.name, slug: input.slug, type: input.type })
    .select('*')
    .single()
  if (error) throw error
  return data as Quiz
}

export async function updateQuiz(
  id: string,
  patch: Partial<Quiz>
): Promise<void> {
  const { error } = await sb().from('quizzes').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteQuiz(id: string): Promise<void> {
  const { error } = await sb().from('quizzes').delete().eq('id', id)
  if (error) throw error
}

// ── Questions ────────────────────────────────────────────────────────────────
export async function listQuestions(quizId: string): Promise<Question[]> {
  const { data, error } = await sb()
    .from('questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('order', { ascending: true })
  if (error) throw error
  return (data ?? []) as Question[]
}

export async function createQuestion(
  quizId: string,
  order: number
): Promise<Question> {
  const { data, error } = await sb()
    .from('questions')
    .insert({
      quiz_id: quizId,
      order,
      text: '',
      type: 'multiple_choice',
      options: [],
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Question
}

export async function updateQuestion(
  id: string,
  patch: Partial<Question>
): Promise<void> {
  const { error } = await sb().from('questions').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await sb().from('questions').delete().eq('id', id)
  if (error) throw error
}

// ── Results ──────────────────────────────────────────────────────────────────
export async function listResults(quizId: string): Promise<Result[]> {
  const { data, error } = await sb()
    .from('results')
    .select('*')
    .eq('quiz_id', quizId)
    .order('order', { ascending: true })
  if (error) throw error
  return (data ?? []) as Result[]
}

export async function createResult(
  quizId: string,
  order: number
): Promise<Result> {
  const { data, error } = await sb()
    .from('results')
    .insert({
      quiz_id: quizId,
      order,
      name: '',
      text: '',
      score_condition: {},
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Result
}

export async function updateResult(
  id: string,
  patch: Partial<Result>
): Promise<void> {
  const { error } = await sb().from('results').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteResult(id: string): Promise<void> {
  const { error } = await sb().from('results').delete().eq('id', id)
  if (error) throw error
}
