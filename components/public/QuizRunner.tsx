'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PublicQuiz,
  QuizSettings,
  EnneagramConfig,
  Question,
  Result,
  Option,
  ScaleConfig,
  TextConfig,
} from '@/types'
import { computeScores, type Answers } from '@/lib/scoring'
import { computeEnneagram, type EnneagramOutcome } from '@/lib/enneagram'

type Phase = 'intro' | 'lead' | 'question' | 'submitting' | 'result'
type Contact = {
  name?: string
  email?: string
  whatsapp?: string
  instagram?: string
}
type Collect = {
  name: boolean
  email: boolean
  whatsapp: boolean
  instagram: boolean
}

// Renderiza texto com suporte a **negrito** (asteriscos duplos → <strong>).
// Mantém quebras de linha (o container usa whitespace-pre-line).
function renderRich(text?: string | null): React.ReactNode {
  if (!text) return null
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  )
}

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
  const settings: QuizSettings = quiz.settings ?? {}
  const primary = settings.primary_color || '#10b981'

  const collect: Collect = {
    name: settings.collect_name ?? true,
    email: settings.collect_email ?? true,
    whatsapp: settings.collect_whatsapp ?? true,
    instagram: settings.collect_instagram ?? false,
  }
  const shouldCollect =
    collect.name || collect.email || collect.whatsapp || collect.instagram

  const isEnnea = settings.result_mode === 'enneagram'

  const [phase, setPhase] = useState<Phase>('intro')
  const [currentId, setCurrentId] = useState<string>(questions[0]?.id ?? '')
  const [answeredCount, setAnsweredCount] = useState(0)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [ennea, setEnnea] = useState<EnneagramOutcome | null>(null)

  const resumeRef = useRef<{ id: string } | 'finish' | null>(null)
  const forcedRef = useRef<string | null>(null)
  const contactRef = useRef<Contact | undefined>(undefined)
  // Espelho síncrono das respostas — evita perder a última resposta no submit
  // (o setState de answers ainda não teria propagado quando o submit dispara).
  const answersRef = useRef<Answers>({})

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
    answersRef.current = { ...answersRef.current, [question.id]: value }
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
    const finalAnswers = answersRef.current
    // No modo eneagrama o resultado (perfil + radar) é calculado no cliente.
    if (isEnnea) setEnnea(computeEnneagram(computeScores(questions, finalAnswers)))
    try {
      const res = await fetch('/api/public/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: quiz.slug,
          answers: finalAnswers,
          contact: contactRef.current,
          forced_result_id: forcedRef.current,
        }),
      })
      const json = await res.json()
      if (!isEnnea) setResult(json.result ?? null)
    } catch {
      if (!isEnnea) setResult(null)
    } finally {
      setPhase('result')
    }
  }

  const showProgress =
    (phase === 'question' || phase === 'lead') && questions.length > 0
  const stepNumber = Math.min(answeredCount + 1, questions.length)

  return (
    <div
      className="flex min-h-screen flex-col items-center px-4 py-8"
      style={{ background: `linear-gradient(180deg, #ffffff 0%, ${primary}14 100%)` }}
    >
      <div className="w-full max-w-md">
        {settings.logo_url && (
          <div className="mb-6 mt-3 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.logo_url}
              alt={quiz.name}
              className="h-[72px] w-auto object-contain"
            />
          </div>
        )}

        {showProgress && (
          <div className="mb-4">
            <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-500">
              <span>
                Pergunta {stepNumber} de {questions.length}
              </span>
              <span>{progress}%</span>
            </div>
            <ProgressBar percent={progress} primary={primary} />
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
          {phase === 'intro' && (
            <IntroScreen settings={settings} quizName={quiz.name} primary={primary} onStart={begin} />
          )}

          {phase === 'question' && currentQuestion && (
            <div key={currentQuestion.id} className="q-anim">
              <QuestionScreen
                question={currentQuestion}
                primary={primary}
                onAnswer={(value, chosen) => advance(currentQuestion, value, chosen)}
              />
            </div>
          )}

          {phase === 'lead' && (
            <div className="q-anim">
              <LeadScreen
                collect={collect}
                primary={primary}
                socialProof={settings.intro_social_proof}
                onSubmit={(contact) => afterLead(contact)}
              />
            </div>
          )}

          {phase === 'submitting' && <CalculatingScreen primary={primary} />}

          {phase === 'result' && (
            <div className="q-anim">
              {isEnnea ? (
                <EnneagramResultScreen
                  outcome={ennea}
                  config={settings.enneagram}
                  settings={settings}
                  primary={primary}
                />
              ) : (
                <ResultScreen
                  result={result}
                  settings={settings}
                  primary={primary}
                />
              )}
            </div>
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

function ProgressBar({ percent, primary }: { percent: number; primary: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(4, percent)}%`, backgroundColor: primary }}
      />
    </div>
  )
}

function CalculatingScreen({ primary }: { primary: string }) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setPct((p) => (p >= 100 ? 100 : p + 2))
    }, 30)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="py-10 text-center">
      <div className="text-5xl font-bold tabular-nums" style={{ color: primary }}>
        {pct}%
      </div>
      <div className="mx-auto mt-5 h-2 w-48 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{ width: `${pct}%`, backgroundColor: primary }}
        />
      </div>
      <p className="mt-4 text-sm text-slate-500">Analisando suas respostas…</p>
    </div>
  )
}

function Pill({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
      <span aria-hidden>{icon}</span>
      {children}
    </span>
  )
}

function IntroScreen({
  settings,
  quizName,
  primary,
  onStart,
}: {
  settings: QuizSettings
  quizName: string
  primary: string
  onStart: () => void
}) {
  return (
    <div className="py-2 text-center">
      <h1 className="text-2xl font-bold leading-tight text-slate-900">
        {renderRich(settings.intro_title || quizName)}
      </h1>
      {settings.intro_subtitle && (
        <p className="mx-auto mt-3 max-w-sm whitespace-pre-line text-[15px] leading-relaxed text-slate-600">
          {renderRich(settings.intro_subtitle)}
        </p>
      )}
      {(settings.intro_social_proof || settings.intro_time) && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {settings.intro_social_proof && (
            <Pill icon="👥">{settings.intro_social_proof}</Pill>
          )}
          {settings.intro_time && <Pill icon="⏱️">{settings.intro_time}</Pill>}
        </div>
      )}
      <button
        onClick={onStart}
        className="mt-7 w-full rounded-xl py-4 text-[15px] font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]"
        style={{ backgroundColor: primary }}
      >
        {settings.intro_cta || 'Começar'}
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
      <h2 className="text-lg font-semibold leading-snug text-slate-900">
        {renderRich(question.text)}
      </h2>
      <div className="mt-5">
        {question.type === 'multiple_choice' && (
          <div className="space-y-2.5">
            {(question.options as Option[]).map((o, i) => (
              <button
                key={o.id}
                onClick={() => onAnswer(o.id, o)}
                className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3.5 text-left text-[15px] text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
                style={{ transitionProperty: 'background-color, border-color, transform' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = primary)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${primary}1a`, color: primary }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{o.label ? renderRich(o.label) : '—'}</span>
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
            className="h-12 w-12 rounded-full border-2 text-sm font-semibold text-slate-700 transition hover:text-white active:scale-95"
            style={{ borderColor: primary }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = primary)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {n}
          </button>
        ))}
      </div>
      {(config.min_label || config.max_label) && (
        <div className="mt-3 flex justify-between text-xs text-slate-400">
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
        className="min-h-[100px] w-full resize-y rounded-xl border border-slate-200 p-3.5 text-[15px] outline-none focus:border-slate-400"
      />
      <button
        onClick={() => onSubmit(text)}
        className="mt-3 w-full rounded-xl py-4 text-[15px] font-semibold text-white transition hover:brightness-105 active:scale-[0.98]"
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
  socialProof,
  onSubmit,
}: {
  collect: Collect
  primary: string
  socialProof?: string
  onSubmit: (contact: Contact) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      name: collect.name ? name.trim() : undefined,
      email: collect.email ? email.trim() : undefined,
      whatsapp: collect.whatsapp ? whatsapp.trim() : undefined,
      instagram: collect.instagram ? instagram.trim() : undefined,
    })
  }

  const field =
    'w-full rounded-xl border border-slate-200 px-4 py-3.5 text-[15px] outline-none focus:border-slate-400'

  return (
    <form onSubmit={submit}>
      <h2 className="text-xl font-bold text-slate-900">
        Quase lá! Pra onde enviamos seu resultado?
      </h2>
      {socialProof && (
        <p className="mt-1.5 text-sm text-slate-500">{socialProof}</p>
      )}
      <div className="mt-5 space-y-3">
        {collect.name && (
          <input
            required
            name="name"
            autoComplete="name"
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
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu melhor e-mail"
            className={field}
          />
        )}
        {collect.whatsapp && (
          <input
            required
            type="tel"
            name="tel"
            autoComplete="tel"
            inputMode="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Seu WhatsApp"
            className={field}
          />
        )}
        {collect.instagram && (
          <input
            required
            name="instagram"
            autoComplete="off"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="Seu @ do Instagram"
            className={field}
          />
        )}
      </div>
      <button
        type="submit"
        className="mt-5 w-full rounded-xl py-4 text-[15px] font-semibold text-white transition hover:brightness-105 active:scale-[0.98]"
        style={{ backgroundColor: primary }}
      >
        Ver meu resultado
      </button>
      <p className="mt-3 text-center text-xs text-slate-400">
        🔒 Seus dados estão seguros. Nada de spam.
      </p>
    </form>
  )
}

function ResultScreen({
  result,
  settings,
  primary,
}: {
  result: Result | null
  settings: QuizSettings
  primary: string
}) {
  // Pool de depoimentos (novo formato de lista, com fallback pro legado).
  const pool =
    settings.testimonials && settings.testimonials.length > 0
      ? settings.testimonials
      : settings.testimonial_text
        ? [
            {
              text: settings.testimonial_text,
              author: settings.testimonial_author || '',
            },
          ]
        : []
  // Sorteia um depoimento (fixo durante a sessão de resultado).
  const [tIdx] = useState(() =>
    pool.length > 0 ? Math.floor(Math.random() * pool.length) : 0
  )
  const testimonial = pool[tIdx]
  const compact = settings.compact_result_layout

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
    <div className="text-center">
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white ${compact ? 'mb-3' : 'mb-4'}`}
        style={{ backgroundColor: primary }}
      >
        ✓
      </div>
      <h2 className="text-xl font-bold text-slate-900">
        {renderRich(result.name)}
      </h2>
      {result.text && (
        <p className={`whitespace-pre-line text-[15px] leading-relaxed text-slate-600 ${compact ? 'mt-2' : 'mt-3'}`}>
          {renderRich(result.text)}
        </p>
      )}

      {testimonial && testimonial.text && (
        <div className={`rounded-xl border border-slate-200 bg-slate-50 text-left ${compact ? 'mt-4 p-3' : 'mt-5 p-4'}`}>
          <p className="text-sm italic leading-relaxed text-slate-600">
            “{renderRich(testimonial.text)}”
          </p>
          {testimonial.author && (
            <p className={`text-xs font-semibold text-slate-700 ${compact ? 'mt-1.5' : 'mt-2'}`}>
              — {testimonial.author}
            </p>
          )}
        </div>
      )}

      {settings.result_guarantee && (
        <div className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-medium text-emerald-700 ${compact ? 'mt-4' : 'mt-5'}`}>
          <span aria-hidden>🛡️</span>
          {settings.result_guarantee}
        </div>
      )}

      {result.cta_url && (
        <a
          href={result.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-block w-full rounded-xl text-[15px] font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98] ${compact ? 'mt-4 py-3.5' : 'mt-6 py-4'}`}
          style={{ backgroundColor: primary }}
        >
          {result.cta_label || 'Continuar'}
        </a>
      )}
    </div>
  )
}

function EnneagramResultScreen({
  outcome,
  config,
  settings,
  primary,
}: {
  outcome: EnneagramOutcome | null
  config?: EnneagramConfig
  settings: QuizSettings
  primary: string
}) {
  const pool = settings.testimonials ?? []
  const [tIdx] = useState(() =>
    pool.length > 0 ? Math.floor(Math.random() * pool.length) : 0
  )
  const testimonial = pool[tIdx]

  if (!outcome || !config) {
    return (
      <div className="py-6 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Obrigado!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Suas respostas foram registradas.
        </p>
      </div>
    )
  }

  const { profile, radar } = outcome
  const single = profile.length === 1

  return (
    <div>
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
          style={{ backgroundColor: primary }}
        >
          ✓
        </div>
      </div>

      <h2 className="text-center text-lg font-bold uppercase tracking-wide text-slate-400">
        Seu perfil
      </h2>

      {profile.length === 0 ? (
        <p className="mt-2 text-center text-sm text-slate-500">
          Não foi possível definir um perfil.
        </p>
      ) : single ? (
        <div className="mt-2">
          <h3
            className="text-center text-xl font-bold"
            style={{ color: primary }}
          >
            {config.types[profile[0]]?.name}
          </h3>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-slate-600">
            {renderRich(config.types[profile[0]]?.full)}
          </p>
          {config.types[profile[0]]?.comm && (
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <strong>Na comunicação:</strong>{' '}
              {config.types[profile[0]]?.comm}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-center text-sm text-slate-500">
            Seu perfil é uma combinação de {profile.length} tipos:
          </p>
          <div className="mt-3 space-y-3">
            {profile.map((k) => (
              <div
                key={k}
                className="rounded-xl border border-slate-200 p-4"
              >
                <h3 className="font-bold" style={{ color: primary }}>
                  {config.types[k]?.name}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {renderRich(config.types[k]?.short)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {radar.length > 0 && (
        <div className="mt-8">
          <h2 className="text-center text-lg font-bold uppercase tracking-wide text-slate-400">
            Seu radar emocional agora
          </h2>
          <div className="mt-3 space-y-3">
            {radar.map((k) => (
              <div
                key={k}
                className="rounded-xl bg-slate-50 p-4"
                style={{ borderLeft: `3px solid ${primary}` }}
              >
                <p className="text-sm font-semibold text-slate-800">
                  {config.vices[k]?.name}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {renderRich(config.vices[k]?.text)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {config.closing && (
        <p className="mt-6 whitespace-pre-line text-center text-[15px] leading-relaxed text-slate-600">
          {renderRich(config.closing)}
        </p>
      )}

      {settings.result_guarantee && (
        <div className="mt-5 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-medium text-emerald-700">
            <span aria-hidden>🛡️</span>
            {settings.result_guarantee}
          </span>
        </div>
      )}

      {testimonial && testimonial.text && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <p className="text-sm italic leading-relaxed text-slate-600">
            “{renderRich(testimonial.text)}”
          </p>
          {testimonial.author && (
            <p className="mt-2 text-xs font-semibold text-slate-700">
              — {testimonial.author}
            </p>
          )}
        </div>
      )}

      {config.cta_url && (
        <a
          href={config.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block w-full rounded-xl py-4 text-center text-[15px] font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]"
          style={{ backgroundColor: primary }}
        >
          {config.cta_label || 'Continuar'}
        </a>
      )}
    </div>
  )
}
