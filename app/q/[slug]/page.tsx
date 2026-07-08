import type { Metadata } from 'next'
import { getPublicQuiz } from '@/lib/public'
import { QuizRunner } from '@/components/public/QuizRunner'

// Sempre renderiza fresco (as configurações do quiz mudam no banco a qualquer hora).
export const dynamic = 'force-dynamic'

// Preview de link (WhatsApp/redes): título e descrição do próprio quiz.
// A imagem vem do arquivo opengraph-image.tsx (convention do Next).
export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const data = await getPublicQuiz(params.slug)
  if (!data) return { title: 'Quiz' }
  const s = data.quiz.settings ?? {}
  const title = s.intro_title || data.quiz.name
  const description =
    s.intro_subtitle || 'Responda o quiz e descubra seu resultado.'
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PublicQuizPage({
  params,
}: {
  params: { slug: string }
}) {
  const data = await getPublicQuiz(params.slug)

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-800">
            Quiz não encontrado
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Este quiz não existe ou ainda não foi publicado.
          </p>
        </div>
      </div>
    )
  }

  return <QuizRunner data={data} />
}
