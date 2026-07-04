'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Quiz, Result, ScoreCondition } from '@/types'
import { createResult, updateResult, deleteResult } from '@/lib/quizzes'
import { errMsg } from '@/lib/err'
import { inputCls, textareaCls, selectCls, Field } from '@/components/ui/form'

export function ResultsTab({
  quiz,
  results,
  onChange,
}: {
  quiz: Quiz
  results: Result[]
  onChange: (rs: Result[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const categories = quiz.settings?.categories ?? []

  async function add() {
    setAdding(true)
    try {
      const r = await createResult(quiz.id, results.length)
      onChange([...results, r])
    } catch (e: unknown) {
      toast.error('Erro ao adicionar: ' + errMsg(e))
    } finally {
      setAdding(false)
    }
  }

  async function remove(r: Result) {
    if (!confirm('Excluir este resultado?')) return
    try {
      await deleteResult(r.id)
      onChange(results.filter((x) => x.id !== r.id))
    } catch (e: unknown) {
      toast.error('Erro ao excluir: ' + errMsg(e))
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Os resultados são avaliados de cima para baixo — o primeiro cuja
        condição casar é exibido. Deixe um resultado como{' '}
        <strong>Fallback</strong> (sem condição) por último, para garantir que
        sempre haja um resultado.
      </p>

      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Nenhum resultado ainda.
        </div>
      ) : (
        results.map((r) => (
          <ResultCard
            key={r.id}
            result={r}
            categories={categories}
            onRemove={remove}
            onSaved={(u) =>
              onChange(results.map((x) => (x.id === u.id ? u : x)))
            }
          />
        ))
      )}

      <button
        onClick={add}
        disabled={adding}
        className="w-full rounded-lg border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-60"
      >
        {adding ? 'Adicionando…' : '+ Adicionar resultado'}
      </button>
    </div>
  )
}

type CondType = 'winning' | 'range' | 'fallback'

function condTypeOf(c: ScoreCondition): CondType {
  if (c.winning_category) return 'winning'
  if (c.category) return 'range'
  return 'fallback'
}

function ResultCard({
  result,
  categories,
  onRemove,
  onSaved,
}: {
  result: Result
  categories: string[]
  onRemove: (r: Result) => void
  onSaved: (r: Result) => void
}) {
  const [draft, setDraft] = useState<Result>(result)
  const [saving, setSaving] = useState(false)
  const condType = condTypeOf(draft.score_condition)

  function setCond(c: ScoreCondition) {
    setDraft({ ...draft, score_condition: c })
  }

  function changeCondType(t: CondType) {
    if (t === 'fallback') setCond({})
    else if (t === 'winning')
      setCond({ winning_category: categories[0] ?? '' })
    else setCond({ category: categories[0] ?? '', min: 0 })
  }

  async function save() {
    setSaving(true)
    try {
      await updateResult(draft.id, {
        name: draft.name,
        text: draft.text,
        cta_label: draft.cta_label || null,
        cta_url: draft.cta_url || null,
        score_condition: draft.score_condition,
      })
      onSaved(draft)
      toast.success('Resultado salvo.')
    } catch (e: unknown) {
      toast.error('Erro ao salvar: ' + errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  const cond = draft.score_condition

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <Field label="Nome do resultado (interno)">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className={inputCls}
          placeholder="Ex.: Comunicador Estratégico"
        />
      </Field>
      <Field label="Título / texto exibido ao lead">
        <textarea
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          className={textareaCls}
          placeholder="Descrição do resultado que o lead vê."
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Texto do botão (CTA)">
          <input
            value={draft.cta_label ?? ''}
            onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })}
            className={inputCls}
            placeholder="Quero saber mais"
          />
        </Field>
        <Field label="Link do botão">
          <input
            value={draft.cta_url ?? ''}
            onChange={(e) => setDraft({ ...draft, cta_url: e.target.value })}
            className={inputCls}
            placeholder="https://... (checkout, WhatsApp, página)"
          />
        </Field>
      </div>

      <Field
        label="Condição para exibir este resultado"
        hint="Como o sistema decide mostrar este resultado com base na pontuação."
      >
        <select
          value={condType}
          onChange={(e) => changeCondType(e.target.value as CondType)}
          className={selectCls}
        >
          <option value="winning">Categoria vencedora (maior pontuação)</option>
          <option value="range">Faixa de pontos numa categoria</option>
          <option value="fallback">Fallback (sempre — usar por último)</option>
        </select>
      </Field>

      {condType === 'winning' && (
        <Field label="Categoria">
          <select
            value={cond.winning_category ?? ''}
            onChange={(e) => setCond({ winning_category: e.target.value })}
            className={selectCls}
          >
            <CategoryOptions categories={categories} />
          </select>
        </Field>
      )}

      {condType === 'range' && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Categoria">
            <select
              value={cond.category ?? ''}
              onChange={(e) => setCond({ ...cond, category: e.target.value })}
              className={selectCls}
            >
              <CategoryOptions categories={categories} />
            </select>
          </Field>
          <Field label="Mín. (≥)">
            <input
              type="number"
              value={cond.min ?? 0}
              onChange={(e) =>
                setCond({ ...cond, min: Number(e.target.value) || 0 })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Máx. (≤, opcional)">
            <input
              type="number"
              value={cond.max ?? ''}
              onChange={(e) =>
                setCond({
                  ...cond,
                  max:
                    e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className={inputCls}
            />
          </Field>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
        <button
          onClick={() => onRemove(result)}
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
  )
}

function CategoryOptions({ categories }: { categories: string[] }) {
  if (categories.length === 0)
    return <option value="">— defina categorias nas Configurações —</option>
  return (
    <>
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </>
  )
}
