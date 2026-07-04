'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type {
  Quiz,
  Question,
  Result,
  Option,
  ScaleConfig,
  TextConfig,
  QuestionType,
} from '@/types'
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '@/lib/quizzes'
import { errMsg } from '@/lib/err'
import { inputCls, textareaCls, selectCls } from '@/components/ui/form'

export function QuestionsTab({
  quiz,
  questions,
  results,
  onChange,
}: {
  quiz: Quiz
  questions: Question[]
  results: Result[]
  onChange: (qs: Question[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const categories = quiz.settings?.categories ?? []

  async function addQuestion() {
    setAdding(true)
    try {
      const q = await createQuestion(quiz.id, questions.length)
      onChange([...questions, q])
    } catch (e: unknown) {
      toast.error('Erro ao adicionar: ' + errMsg(e))
    } finally {
      setAdding(false)
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= questions.length) return
    const reordered = [...questions]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    // Reatribui `order` sequencial e persiste os que mudaram.
    const withOrder = reordered.map((q, i) => ({ ...q, order: i }))
    onChange(withOrder)
    try {
      await Promise.all(
        withOrder
          .filter((q, i) => questions[i]?.id !== q.id)
          .map((q) => updateQuestion(q.id, { order: q.order }))
      )
    } catch (e: unknown) {
      toast.error('Erro ao reordenar: ' + errMsg(e))
    }
  }

  async function remove(q: Question) {
    if (!confirm('Excluir esta pergunta?')) return
    try {
      await deleteQuestion(q.id)
      onChange(questions.filter((x) => x.id !== q.id))
    } catch (e: unknown) {
      toast.error('Erro ao excluir: ' + errMsg(e))
    }
  }

  return (
    <div className="space-y-4">
      {categories.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Dica: defina as{' '}
          <strong>categorias de pontuação</strong> na aba Configurações para
          poder atribuir pesos às respostas.
        </div>
      )}

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Nenhuma pergunta ainda.
        </div>
      ) : (
        questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            index={i}
            total={questions.length}
            question={q}
            categories={categories}
            questions={questions}
            results={results}
            onMove={move}
            onRemove={remove}
            onSaved={(updated) =>
              onChange(questions.map((x) => (x.id === updated.id ? updated : x)))
            }
          />
        ))
      )}

      <button
        onClick={addQuestion}
        disabled={adding}
        className="w-full rounded-lg border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-60"
      >
        {adding ? 'Adicionando…' : '+ Adicionar pergunta'}
      </button>
    </div>
  )
}

function QuestionCard({
  index,
  total,
  question,
  categories,
  questions,
  results,
  onMove,
  onRemove,
  onSaved,
}: {
  index: number
  total: number
  question: Question
  categories: string[]
  questions: Question[]
  results: Result[]
  onMove: (index: number, dir: -1 | 1) => void
  onRemove: (q: Question) => void
  onSaved: (q: Question) => void
}) {
  const [draft, setDraft] = useState<Question>(question)
  const [saving, setSaving] = useState(false)

  function changeType(type: QuestionType) {
    let options: Question['options']
    if (type === 'multiple_choice') options = []
    else if (type === 'scale')
      options = { min: 1, max: 5, min_label: '', max_label: '' } as ScaleConfig
    else options = { placeholder: '' } as TextConfig
    setDraft({ ...draft, type, options })
  }

  async function save() {
    setSaving(true)
    try {
      await updateQuestion(draft.id, {
        text: draft.text,
        type: draft.type,
        options: draft.options,
      })
      onSaved(draft)
      toast.success('Pergunta salva.')
    } catch (e: unknown) {
      toast.error('Erro ao salvar: ' + errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
          {index + 1}
        </span>
        <div className="flex-1 space-y-3">
          <textarea
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            className={textareaCls}
            placeholder="Texto da pergunta"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Tipo:</label>
            <select
              value={draft.type}
              onChange={(e) => changeType(e.target.value as QuestionType)}
              className={selectCls + ' w-auto'}
            >
              <option value="multiple_choice">Múltipla escolha</option>
              <option value="scale">Escala</option>
              <option value="text">Texto livre</option>
            </select>
          </div>

          {draft.type === 'multiple_choice' && (
            <OptionsEditor
              options={draft.options as Option[]}
              categories={categories}
              questions={questions}
              results={results}
              currentId={draft.id}
              onChange={(opts) => setDraft({ ...draft, options: opts })}
            />
          )}
          {draft.type === 'scale' && (
            <ScaleEditor
              config={draft.options as ScaleConfig}
              categories={categories}
              onChange={(cfg) => setDraft({ ...draft, options: cfg })}
            />
          )}
          {draft.type === 'text' && (
            <input
              value={(draft.options as TextConfig).placeholder ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, options: { placeholder: e.target.value } })
              }
              className={inputCls}
              placeholder="Placeholder do campo (ex.: Digite sua resposta)"
            />
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex gap-1">
          <IconBtn disabled={index === 0} onClick={() => onMove(index, -1)}>
            ↑
          </IconBtn>
          <IconBtn
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
          >
            ↓
          </IconBtn>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onRemove(question)}
            className="text-xs text-slate-400 hover:text-red-500"
          >
            Excluir
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Editor de opções (múltipla escolha) ──────────────────────────────────────
function OptionsEditor({
  options,
  categories,
  questions,
  results,
  currentId,
  onChange,
}: {
  options: Option[]
  categories: string[]
  questions: Question[]
  results: Result[]
  currentId: string
  onChange: (opts: Option[]) => void
}) {
  function addOption() {
    onChange([
      ...options,
      { id: crypto.randomUUID(), label: '', scores: {} },
    ])
  }
  function update(id: string, patch: Partial<Option>) {
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }
  function remove(id: string) {
    onChange(options.filter((o) => o.id !== id))
  }

  return (
    <div className="space-y-2">
      {options.map((o) => (
        <div
          key={o.id}
          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
          <div className="flex items-center gap-2">
            <input
              value={o.label}
              onChange={(e) => update(o.id, { label: e.target.value })}
              className={inputCls + ' bg-white'}
              placeholder="Texto da opção"
            />
            <button
              onClick={() => remove(o.id)}
              className="shrink-0 text-slate-400 hover:text-red-500"
            >
              ✕
            </button>
          </div>

          {categories.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-400">Pontos:</span>
              {categories.map((c) => (
                <label
                  key={c}
                  className="flex items-center gap-1 text-xs text-slate-600"
                >
                  {c}
                  <input
                    type="number"
                    value={o.scores?.[c] ?? 0}
                    onChange={(e) => {
                      const n = Number(e.target.value) || 0
                      const scores = { ...(o.scores ?? {}) }
                      if (n === 0) delete scores[c]
                      else scores[c] = n
                      update(o.id, { scores })
                    }}
                    className="w-14 rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                </label>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-400">Após responder:</span>
            <select
              value={
                o.end_result_id
                  ? `r:${o.end_result_id}`
                  : o.next_question_id
                    ? `q:${o.next_question_id}`
                    : ''
              }
              onChange={(e) => {
                const v = e.target.value
                if (!v) update(o.id, { next_question_id: null, end_result_id: null })
                else if (v.startsWith('q:'))
                  update(o.id, {
                    next_question_id: v.slice(2),
                    end_result_id: null,
                  })
                else
                  update(o.id, {
                    end_result_id: v.slice(2),
                    next_question_id: null,
                  })
              }}
              className={selectCls + ' w-auto text-xs'}
            >
              <option value="">Próxima pergunta</option>
              <optgroup label="Pular para pergunta">
                {questions
                  .filter((q) => q.id !== currentId)
                  .map((q, i) => (
                    <option key={q.id} value={`q:${q.id}`}>
                      Pergunta {i + 1}
                      {q.text ? ` — ${q.text.slice(0, 30)}` : ''}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Encerrar com resultado">
                {results.map((r) => (
                  <option key={r.id} value={`r:${r.id}`}>
                    {r.name || 'Resultado sem nome'}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      ))}
      <button
        onClick={addOption}
        className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
      >
        + Adicionar opção
      </button>
    </div>
  )
}

// ── Editor de escala ─────────────────────────────────────────────────────────
function ScaleEditor({
  config,
  categories,
  onChange,
}: {
  config: ScaleConfig
  categories: string[]
  onChange: (cfg: ScaleConfig) => void
}) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-slate-600">
          Mínimo
          <input
            type="number"
            value={config.min}
            onChange={(e) =>
              onChange({ ...config, min: Number(e.target.value) || 0 })
            }
            className={inputCls + ' mt-1 bg-white'}
          />
        </label>
        <label className="text-xs text-slate-600">
          Máximo
          <input
            type="number"
            value={config.max}
            onChange={(e) =>
              onChange({ ...config, max: Number(e.target.value) || 0 })
            }
            className={inputCls + ' mt-1 bg-white'}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-slate-600">
          Rótulo do mínimo
          <input
            value={config.min_label ?? ''}
            onChange={(e) => onChange({ ...config, min_label: e.target.value })}
            className={inputCls + ' mt-1 bg-white'}
            placeholder="Discordo"
          />
        </label>
        <label className="text-xs text-slate-600">
          Rótulo do máximo
          <input
            value={config.max_label ?? ''}
            onChange={(e) => onChange({ ...config, max_label: e.target.value })}
            className={inputCls + ' mt-1 bg-white'}
            placeholder="Concordo"
          />
        </label>
      </div>
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span className="text-xs text-slate-400">
            Pontos por unidade (valor escolhido × peso):
          </span>
          {categories.map((c) => (
            <label
              key={c}
              className="flex items-center gap-1 text-xs text-slate-600"
            >
              {c}
              <input
                type="number"
                value={config.scores_per_point?.[c] ?? 0}
                onChange={(e) => {
                  const n = Number(e.target.value) || 0
                  const spp = { ...(config.scores_per_point ?? {}) }
                  if (n === 0) delete spp[c]
                  else spp[c] = n
                  onChange({ ...config, scores_per_point: spp })
                }}
                className="w-14 rounded border border-slate-300 px-2 py-1 text-xs"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function IconBtn({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
    >
      {children}
    </button>
  )
}
