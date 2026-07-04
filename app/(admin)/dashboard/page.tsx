import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bem-vindo ao painel do camaleãoquiz.
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Comece por aqui
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Crie seu primeiro funil interativo e compartilhe o link público.
        </p>
        <Link
          href="/quizzes"
          className="mt-4 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          Ir para Quizzes
        </Link>
      </div>
    </div>
  )
}
