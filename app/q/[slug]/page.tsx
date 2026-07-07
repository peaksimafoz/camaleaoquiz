import { getPublicQuiz } from '@/lib/public'
import { QuizRunner } from '@/components/public/QuizRunner'

// Sempre renderiza fresco (as configurações do quiz mudam no banco a qualquer hora).
export const dynamic = 'force-dynamic'

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
