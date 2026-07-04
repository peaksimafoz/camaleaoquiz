'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Quiz, Question, Result } from '@/types'
import { loadMetrics, type QuizMetrics } from '@/lib/metrics'
import { errMsg } from '@/lib/err'

export function MetricsTab({
  quiz,
  questions,
  results,
}: {
  quiz: Quiz
  questions: Question[]
  results: Result[]
}) {
  const [metrics, setMetrics] = useState<QuizMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      setMetrics(await loadMetrics(quiz.id, questions, results))
    } catch (e: unknown) {
      toast.error('Erro ao carregar métricas: ' + errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.id])

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando métricas…</p>
  }
  if (!metrics) return null

  const maxAnswered = Math.max(
    1,
    ...metrics.answeredByQuestion.map((q) => q.answered)
  )
  const maxResult = Math.max(
    1,
    ...metrics.resultDistribution.map((r) => r.count)
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={load}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        >
          ↻ Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Visitas" value={metrics.views} />
        <Stat label="Iniciados" value={metrics.starts} />
        <Stat label="Concluídos" value={metrics.completed} />
        <Stat
          label="Taxa de conclusão"
          value={`${Math.round(metrics.completionRate * 100)}%`}
          hint="concluídos ÷ iniciados"
        />
      </div>

      <Card title="Funil por pergunta">
        <p className="mb-3 text-xs text-slate-500">
          Quantas pessoas responderam cada pergunta — a queda entre uma e outra
          mostra onde há abandono.
        </p>
        {metrics.answeredByQuestion.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-3">
            {metrics.answeredByQuestion.map((q, i) => (
              <div key={q.questionId}>
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="truncate pr-2">
                    {i + 1}. {q.text}
                  </span>
                  <span className="shrink-0 font-medium">{q.answered}</span>
                </div>
                <Bar percent={(q.answered / maxAnswered) * 100} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Distribuição de resultados">
        {metrics.resultDistribution.length === 0 ||
        metrics.totalLeads === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-3">
            {metrics.resultDistribution.map((r) => (
              <div key={r.resultId ?? 'none'}>
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="truncate pr-2">{r.name}</span>
                  <span className="shrink-0 font-medium">
                    {r.count}
                    {metrics.totalLeads > 0 && (
                      <span className="ml-1 text-slate-400">
                        ({Math.round((r.count / metrics.totalLeads) * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
                <Bar percent={(r.count / maxResult) * 100} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-slate-400">
        {metrics.totalLeads} lead{metrics.totalLeads === 1 ? '' : 's'} capturado
        {metrics.totalLeads === 1 ? '' : 's'} neste quiz.
      </p>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: number | string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-slate-400">{hint}</div>}
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  )
}

function Bar({ percent }: { percent: number }) {
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${Math.max(2, percent)}%` }}
      />
    </div>
  )
}

function Empty() {
  return <p className="text-sm text-slate-400">Sem dados ainda.</p>
}
