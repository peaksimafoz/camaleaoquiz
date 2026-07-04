import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getPublicQuiz } from '@/lib/public'
import { computeScores, resolveResult, type Answers } from '@/lib/scoring'

// POST /api/public/submit → finaliza o quiz: calcula pontuação/resultado,
// grava o lead e o evento 'completed'. Retorna o resultado escolhido.
// Body: { slug, answers, contact?: {name,email,whatsapp}, forced_result_id? }
//
// A pontuação é recalculada no servidor (não confia no cliente).
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      slug,
      answers,
      contact,
      forced_result_id,
    }: {
      slug: string
      answers: Answers
      contact?: { name?: string; email?: string; whatsapp?: string }
      forced_result_id?: string | null
    } = body ?? {}

    if (!slug || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
    }

    const data = await getPublicQuiz(slug)
    if (!data) {
      return NextResponse.json(
        { error: 'Quiz não encontrado ou inativo.' },
        { status: 404 }
      )
    }
    const { quiz, questions, results } = data

    const scores = computeScores(questions, answers)
    const result = forced_result_id
      ? (results.find((r) => r.id === forced_result_id) ??
        resolveResult(results, scores))
      : resolveResult(results, scores)

    const sb = adminClient()
    const { data: lead, error: leadErr } = await sb
      .from('leads')
      .insert({
        quiz_id: quiz.id,
        name: contact?.name || null,
        email: contact?.email || null,
        whatsapp: contact?.whatsapp || null,
        answers,
        scores,
        result_id: result?.id ?? null,
      })
      .select('id')
      .single()

    if (leadErr) throw leadErr

    // Evento de conclusão (não bloqueia se falhar).
    await sb
      .from('quiz_events')
      .insert({
        quiz_id: quiz.id,
        lead_id: lead.id,
        event_type: 'completed',
      })

    // Webhook de integração: envia o lead para a URL configurada no quiz.
    // Aguardamos com timeout curto (ambiente serverless não garante execução
    // após a resposta), mas falha do webhook NUNCA quebra o resultado do lead.
    if (quiz.webhook_url) {
      await dispatchWebhook(quiz.webhook_url, {
        event: 'quiz_completed',
        quiz: {
          id: quiz.id,
          name: quiz.name,
          slug: quiz.slug,
          type: quiz.type,
        },
        lead: {
          id: lead.id,
          name: contact?.name || null,
          email: contact?.email || null,
          whatsapp: contact?.whatsapp || null,
        },
        answers,
        scores,
        result: result
          ? { id: result.id, name: result.name, text: result.text }
          : null,
        completed_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ result, lead_id: lead.id, scores })
  } catch (e) {
    console.error('submit error', e)
    return NextResponse.json(
      { error: 'Erro ao finalizar o quiz.' },
      { status: 500 }
    )
  }
}

// POST fire-and-forget com timeout de 5s. Erros são engolidos (loga e segue) —
// o webhook é "best-effort" e não pode impedir o lead de ver o resultado.
async function dispatchWebhook(url: string, payload: unknown) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeout)
  } catch (e) {
    console.error('webhook error', e)
  }
}
