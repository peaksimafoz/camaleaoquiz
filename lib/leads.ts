import { createClient } from '@/lib/supabase/client'

// Lead com nome do quiz e do resultado embutidos (via join do PostgREST).
export interface LeadRow {
  id: string
  created_at: string
  name: string | null
  email: string | null
  whatsapp: string | null
  instagram: string | null
  quiz_id: string
  answers: Record<string, unknown>
  scores: Record<string, number>
  result_id: string | null
  quizzes: { name: string; slug: string } | null
  results: { name: string } | null
}

export async function listLeads(quizId?: string): Promise<LeadRow[]> {
  const sb = createClient()
  let q = sb
    .from('leads')
    .select('*, quizzes(name, slug), results(name)')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (quizId) q = q.eq('quiz_id', quizId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as LeadRow[]
}

export async function deleteLeads(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await createClient().from('leads').delete().in('id', ids)
  if (error) throw error
}
