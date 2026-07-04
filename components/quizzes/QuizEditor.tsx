'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Quiz, Question, Result } from '@/types'
import {
  getQuiz,
  listQuestions,
  listResults,
  updateQuiz,
} from '@/lib/quizzes'
import { errMsg } from '@/lib/err'
import { SettingsTab } from './SettingsTab'
import { QuestionsTab } from './QuestionsTab'
import { ResultsTab } from './ResultsTab'
import { MetricsTab } from './MetricsTab'

type Tab = 'settings' | 'questions' | 'results' | 'metrics'

export function QuizEditor({ quizId }: { quizId: string }) {
  const router = useRouter()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('settings')

  const load = useCallback(async () => {
    try {
      const [q, qs, rs] = await Promise.all([
        getQuiz(quizId),
        listQuestions(quizId),
        listResults(quizId),
      ])
      if (!q) {
        toast.error('Quiz não encontrado.')
        router.push('/quizzes')
        return
      }
      setQuiz(q)
      setQuestions(qs)
      setResults(rs)
    } catch (e: unknown) {
      toast.error('Erro ao carregar: ' + errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [quizId, router])

  useEffect(() => {
    load()
  }, [load])

  async function toggleStatus() {
    if (!quiz) return
    const next = quiz.status === 'active' ? 'draft' : 'active'
    try {
      await updateQuiz(quiz.id, { status: next })
      setQuiz({ ...quiz, status: next })
      toast.success(next === 'active' ? 'Quiz publicado.' : 'Quiz em rascunho.')
    } catch (e: unknown) {
      toast.error('Erro: ' + errMsg(e))
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-8 py-10 text-sm text-slate-500">
        Carregando…
      </div>
    )
  }
  if (!quiz) return null

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Link
        href="/quizzes"
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Voltar
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{quiz.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Tipo {quiz.type} ·{' '}
            <span className="text-slate-400">/q/{quiz.slug}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleStatus}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              quiz.status === 'active'
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {quiz.status === 'active' ? '● Ativo' : '○ Rascunho'}
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b border-slate-200">
        <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')}>
          Configurações
        </TabBtn>
        <TabBtn active={tab === 'questions'} onClick={() => setTab('questions')}>
          Perguntas ({questions.length})
        </TabBtn>
        <TabBtn active={tab === 'results'} onClick={() => setTab('results')}>
          Resultados ({results.length})
        </TabBtn>
        <TabBtn active={tab === 'metrics'} onClick={() => setTab('metrics')}>
          Métricas
        </TabBtn>
      </div>

      <div className="mt-6">
        {tab === 'settings' && (
          <SettingsTab quiz={quiz} onChange={setQuiz} />
        )}
        {tab === 'questions' && (
          <QuestionsTab
            quiz={quiz}
            questions={questions}
            results={results}
            onChange={setQuestions}
          />
        )}
        {tab === 'results' && (
          <ResultsTab
            quiz={quiz}
            results={results}
            onChange={setResults}
          />
        )}
        {tab === 'metrics' && (
          <MetricsTab quiz={quiz} questions={questions} results={results} />
        )}
      </div>
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? 'border-emerald-500 text-emerald-600'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}
