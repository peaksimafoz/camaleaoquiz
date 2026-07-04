'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  PublicQuiz,
  Question,
  Result,
  Option,
  ScaleConfig,
  TextConfig,
} from '@/types'
import type { Answers } from '@/lib/scoring'

type Phase = 'intro' | 'lead' | 'question' | 'submitting' | 'result'
type Contact = { name?: string; email?: string; whatsapp?: string }
type Collect = { name: boolean; email: boolean; whatsapp: boolean }

// Dispara um evento de analytics (fire-and-forget).
function fireEvent(quizId: string, eventType: string, questionId?: string) {
  fetch('/api/public/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quiz_id: quizId,
      event_type: eventType,
      question_id: questionId ?? null,
    }),
    keepalive: true,
  }).catch(() => {})
}

export function QuizRunner({ data }: { data: PublicQuiz }) {
  const { quiz, questions, results } = data
  const settings = quiz.settings ?? {}
  const primary = settings.primary_color || '#10b981'

  const collect: Collect = {
    name: settings.collect_name ?? true,
    email: settings.collect_email ?? true,
    whatsapp: settings.collect_whatsapp ?? true,
  }
  const shouldCollect = collect.name || collect.email || collect.whatsapp

  const [phase, setPhase] = useState<Phase>('intro')
  const [currentId, setCurrentId] = useState<string>(questions[0]?.id ?? '')
  const [answers, setAnswers] = useState<Answers>({})
  const [answeredCount, setAnsweredCount] = useState(0)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  // Retomada após o formulário de lead, resultado forçado e contato pendente
  // ficam em refs para não depender de re-render entre os passos.
  const resumeRef = useRef<{ id: string } | 'finish' | null>(null)
  const forcedRef = useRef<string | null>(null)
  const contactRef = useRef<Contact | undefined>(undefined)

  const viewedRef = useRef(false)
  useEffect(() => {
    if (!viewedRef.current) {
      viewedRef.current = true
      fireEvent(quiz.id, 'view')
    }
  }, [quiz.id])

  const currentIndex = useMemo(
    () => questions.findIndex((q) => q.id === currentId),
    [questions, currentId]
  )
  const currentQuestion = questions[currentIndex]
  const progress =
    questions.length > 0
      ? Math.round((answeredCount / questions.length) * 100)
      : 0

  function begin() {
    fireEvent(quiz.id, 'start')
    if (shouldCollect && quiz.lead_capture_position === 'start') {
      resumeRef.current = questions[0] ? { id: questions[0].id } : 'finish'
      setPhase('lead')
    } else if (questions.length > 0) {
      setPhase('question')
    } else {
      finish(null)
    }
  }

  function advance(question: Question, value: string | number, chosen?: Option) {
    setAnswers((a) => ({ ...a, [question.id]: value }))
    const newCount = answeredCount + 1
    setAnsweredCount(newCount)
    fireEvent(quiz.id, 'question_answered', question.id)

    if (chosen?.end_result_id) {
      finish(chosen.end_result_id)
      return
    }

    let nextId: string | null = null
    if (chosen?.next_question_id) {
      nextId = chosen.next_question_id
    } else {
      const idx = questions.findIndex((q) => q.id === question.id)
      nextId =
        idx >= 0 && idx + 1 < questions.length ? questions[idx + 1].id : null
    }

    if (
      shouldCollect &&
      !leadCaptured &&
      quiz.lead_capture_position === 'middle' &&
      newCount >= Math.floor(questions.length / 2)
    ) {
      resumeRef.current = nextId ? { id: nextId } : 'finish'
      setPhase('lead')
      return
    }

    if (nextId) setCurrentId(nextId)
    else finish(null)
  }

  function afterLead(contact?: Contact) {
    contactRef.current = contact
    setLeadCaptured(true)
    const resume = resumeRef.current
    resumeRef.current = null
    if (resume && resume !== 'finish') {
      setCurrentId(resume.id)
      setPhase('question')
    } else {
      submit()
    }
  }

  function finish(forced: string | null) {
    forcedRef.current = forced
    if (shouldCollect && !leadCaptured && quiz.lead_capture_position === 'end') {
      resumeRef.current = 'finish'
      setPhase('lead')
      return
    }
    submit()
  }

  async function submit() {
    setPhase('submitting')
    try {
      const res = await fetch('/api/public/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: quiz.slug,
          answers,
          contact: contactRef.current,
          forced_result_id: forcedRef.current,
        }),
      })
      const json = await res.json()
      setResult(json.result ?? null)
    } catch {
      setResult(null)
    } finally {
      setPhase('result')
    }
  }

  const showProgress =
    (phase === 'question' || phase === 'lead') && questions.length > 0

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        {showProgress && <ProgressBar percent={progress} primary={primary} />}

        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          {phase === 'intro' && (
            <IntroScreen
              title={settings.intro_title || quiz.name}
              subtitle={settings.intro_subtitle}
              cta={settings.intro_cta || 'Começar'}
              primary={primary}
              onStart={begin}
            />
          )}

          {phase === 'question' && currentQuestion && (
            <QuestionScreen
              key={currentQuestion.id}
              question={currentQuestion}
              primary={primary}
              onAnswer={(value, chosen) =>
                advance(currentQuestion, value, chosen)
              }
            />
          )}

          {phase === 'lead' && (
            <LeadScreen
              collect={collect}
              primary={primary}
              onSubmit={(contact) => afterLead(contact)}
            />
          )}

          {phase === 'submitting' && (
            <div className="py-10 text-center text-sm text-slate-500">
              Calculando seu resultado…
            </div>
          )}

          {phase === 'result' && (
            <ResultScreen result={result} primary={primary} />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-300">
          feito com camaleãoquiz
        </p>
      </div>
    </div>
  )
}

// ── Sub-telas ─────────────────────────────────────────────────────────────────

function ProgressBar({
  percent,
  primary,
}: {
  percent: number
  primary: string
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${percent}%`, backgroundColor: primary }}
      />
    </div>
  )
}

function IntroScreen({
  title,
  subtitle,
  cta,
  primary,
  onStart,
}: {
  title: string
  subtitle?: string
  cta: string
  primary: string
  onStart: () => void
}) {
  return (
    <div className="py-4 text-center">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && (
        <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
          {subtitle}
        </p>
      )}
      <button
        onClick={onStart}
        className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        style={{ backgroundColor: primary }}
      >
        {cta}
      </button>
    </div>
  )
}

function QuestionScreen({
  question,
  primary,
  onAnswer,
}: {
  question: Question
  primary: string
  onAnswer: (value: string | number, chosen?: Option) => void
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{question.text}</h2>
      <div className="mt-5">
        {question.type === 'multiple_choice' && (
          <div className="space-y-2">
            {(question.options as Option[]).map((o) => (
              <button
                key={o.id}
                onClick={() => onAnswer(o.id, o)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
              >
                {o.label || '—'}
              </button>
            ))}
          </div>
        )}
        {question.type === 'scale' && (
          <ScaleInput
            config={question.options as ScaleConfig}
            primary={primary}
            onPick={(n) => onAnswer(n)}
          />
        )}
        {question.type === 'text' && (
          <TextInput
            config={question.options as TextConfig}
            primary={primary}
            onSubmit={(t) => onAnswer(t)}
          />
        )}
      </div>
    </div>
  )
}

function ScaleInput({
  config,
  primary,
  onPick,
}: {
  config: ScaleConfig
  primary: string
  onPick: (n: number) => void
}) {
  const min = config.min ?? 1
  const max = config.max ?? 5
  const range: number[] = []
  for (let i = min; i <= max; i++) range.push(i)
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {range.map((n) => (
          <button
            key={n}
            onClick={() => onPick(n)}
            className="h-11 w-11 rounded-full border border-slate-200 text-sm font-medium text-slate-700 transition hover:text-white active:scale-95"
            style={{ borderColor: primary }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = primary)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            {n}
          </button>
        ))}
      </div>
      {(config.min_label || config.max_label) && (
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>{config.min_label}</span>
          <span>{config.max_label}</span>
        </div>
      )}
    </div>
  )
}

function TextInput({
  config,
  primary,
  onSubmit,
}: {
  config: TextConfig
  primary: string
  onSubmit: (t: string) => void
}) {
  const [text, setText] = useState('')
  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={config.placeholder || 'Digite sua resposta'}
        className="min-h-[90px] w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400"
      />
      <button
        onClick={() => onSubmit(text)}
        className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        style={{ backgroundColor: primary }}
      >
        Continuar
      </button>
    </div>
  )
}

function LeadScreen({
  collect,
  primary,
  onSubmit,
}: {
  collect: Collect
  primary: string
  onSubmit: (contact: Contact) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      name: collect.name ? name.trim() : undefined,
      email: collect.email ? email.trim() : undefined,
      whatsapp: collect.whatsapp ? whatsapp.trim() : undefined,
    })
  }

  const field =
    'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400'

  return (
    <form onSubmit={submit}>
      <h2 className="text-lg font-semibold text-slate-900">
        Quase lá! Onde enviamos seu resultado?
      </h2>
      <div className="mt-4 space-y-3">
        {collect.name && (
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className={field}
          />
        )}
        {collect.email && (
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu e-mail"
            className={field}
          />
        )}
        {collect.whatsapp && (
          <input
            required
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Seu WhatsApp"
            className={field}
          />
        )}
      </div>
      <button
        type="submit"
        className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        style={{ backgroundColor: primary }}
      >
        Ver meu resultado
      </button>
    </form>
  )
}

function ResultScreen({
  result,
  primary,
}: {
  result: Result | null
  primary: string
}) {
  if (!result) {
    return (
      <div className="py-6 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Obrigado!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Suas respostas foram registradas.
        </p>
      </div>
    )
  }
  return (
    <div className="py-2 text-center">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: primary }}
      >
        ✓
      </div>
      <h2 className="text-xl font-bold text-slate-900">{result.name}</h2>
      {result.text && (
        <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
          {result.text}
        </p>
      )}
      {result.cta_url && (
        <a
          href={result.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block w-full rounded-xl py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
          style={{ backgroundColor: primary }}
        >
          {result.cta_label || 'Continuar'}
        </a>
      )}
    </div>
  )
}
