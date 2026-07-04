import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import type { EventType } from '@/types'

const VALID: EventType[] = [
  'view',
  'start',
  'question_answered',
  'completed',
  'abandoned',
]

// POST /api/public/event → registra um evento de funil (analytics).
// Body: { quiz_id, event_type, question_id?, lead_id? }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { quiz_id, event_type, question_id, lead_id } = body ?? {}

    if (!quiz_id || !VALID.includes(event_type)) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
    }

    const { error } = await adminClient()
      .from('quiz_events')
      .insert({
        quiz_id,
        event_type,
        question_id: question_id ?? null,
        lead_id: lead_id ?? null,
      })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    // Analytics não deve quebrar a experiência: loga e responde ok.
    console.error('event error', e)
    return NextResponse.json({ ok: false })
  }
}
