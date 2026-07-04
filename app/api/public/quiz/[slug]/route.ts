import { NextResponse } from 'next/server'
import { getPublicQuiz } from '@/lib/public'

// GET /api/public/quiz/[slug] → quiz ativo + perguntas + resultados.
// Público (o middleware libera /api/public). Útil para embeds futuros.
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const data = await getPublicQuiz(params.slug)
  if (!data) {
    return NextResponse.json(
      { error: 'Quiz não encontrado ou inativo.' },
      { status: 404 }
    )
  }
  return NextResponse.json(data)
}
