'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Quiz, QuizSettings, LeadCapturePosition } from '@/types'
import { updateQuiz } from '@/lib/quizzes'
import { slugify } from '@/lib/utils'
import { errMsg } from '@/lib/err'
import { useAutosave } from '@/lib/useAutosave'
import { SaveBadge } from '@/components/ui/SaveBadge'
import { Field, inputCls, textareaCls, selectCls } from '@/components/ui/form'

export function SettingsTab({
  quiz,
  onChange,
}: {
  quiz: Quiz
  onChange: (q: Quiz) => void
}) {
  const [draft, setDraft] = useState<Quiz>(quiz)
  const [newCat, setNewCat] = useState('')

  // Salvamento automático (debounce). Só salva se nome e slug estiverem preenchidos.
  const saveState = useAutosave(draft, async (d) => {
    if (!d.name.trim() || !d.slug.trim()) return
    try {
      await updateQuiz(d.id, {
        name: d.name.trim(),
        slug: d.slug.trim(),
        type: d.type,
        webhook_url: d.webhook_url || null,
        lead_capture_position: d.lead_capture_position,
        settings: d.settings,
      })
      onChange(d)
    } catch (e: unknown) {
      const m = errMsg(e)
      toast.error(
        m.includes('duplicate') || m.includes('unique')
          ? 'Já existe um quiz com esse slug.'
          : 'Erro ao salvar: ' + m
      )
      throw e
    }
  })

  const s: QuizSettings = draft.settings ?? {}

  function setSettings(patch: Partial<QuizSettings>) {
    setDraft({ ...draft, settings: { ...s, ...patch } })
  }

  const categories = s.categories ?? []

  function addCategory() {
    const c = newCat.trim().toLowerCase()
    if (!c) return
    if (categories.includes(c)) {
      toast.error('Categoria já existe.')
      return
    }
    setSettings({ categories: [...categories, c] })
    setNewCat('')
  }

  function removeCategory(c: string) {
    setSettings({ categories: categories.filter((x) => x !== c) })
  }

  return (
    <div className="space-y-6">
      <Section title="Identificação">
        <Field label="Nome">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Slug (URL pública)">
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-400">/q/</span>
            <input
              value={draft.slug}
              onChange={(e) =>
                setDraft({ ...draft, slug: slugify(e.target.value) })
              }
              className={inputCls}
            />
          </div>
        </Field>
        <Field label="Tipo de funil">
          <select
            value={draft.type}
            onChange={(e) =>
              setDraft({ ...draft, type: e.target.value as Quiz['type'] })
            }
            className={selectCls}
          >
            <option value="A">Tipo A — Diagnóstico / captura de lead</option>
            <option value="B">Tipo B — Qualificação para oferta</option>
          </select>
        </Field>
      </Section>

      <Section title="Tela de abertura (landing)">
        <Field label="Título de abertura">
          <input
            value={s.intro_title ?? ''}
            onChange={(e) => setSettings({ intro_title: e.target.value })}
            className={inputCls}
            placeholder="Descubra seu perfil de comunicação"
          />
        </Field>
        <Field label="Subtítulo / gancho">
          <textarea
            value={s.intro_subtitle ?? ''}
            onChange={(e) => setSettings({ intro_subtitle: e.target.value })}
            className={textareaCls}
            placeholder="Responda 6 perguntas rápidas e receba um diagnóstico personalizado."
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Texto do botão inicial">
            <input
              value={s.intro_cta ?? ''}
              onChange={(e) => setSettings({ intro_cta: e.target.value })}
              className={inputCls}
              placeholder="Começar"
            />
          </Field>
          <Field label="Cor principal">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={s.primary_color ?? '#10b981'}
                onChange={(e) => setSettings({ primary_color: e.target.value })}
                className="h-9 w-12 rounded border border-slate-300"
              />
              <input
                value={s.primary_color ?? '#10b981'}
                onChange={(e) => setSettings({ primary_color: e.target.value })}
                className={inputCls}
              />
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Captura de lead">
        <Field
          label="Quando pedir os dados de contato"
          hint="Início: antes das perguntas. Meio: no meio do quiz. Fim: junto ao resultado."
        >
          <select
            value={draft.lead_capture_position}
            onChange={(e) =>
              setDraft({
                ...draft,
                lead_capture_position: e.target.value as LeadCapturePosition,
              })
            }
            className={selectCls}
          >
            <option value="start">Início</option>
            <option value="middle">Meio</option>
            <option value="end">Fim</option>
          </select>
        </Field>
        <div className="flex flex-wrap gap-4 pt-1">
          <Check
            label="Nome"
            checked={s.collect_name ?? true}
            onChange={(v) => setSettings({ collect_name: v })}
          />
          <Check
            label="E-mail"
            checked={s.collect_email ?? true}
            onChange={(v) => setSettings({ collect_email: v })}
          />
          <Check
            label="WhatsApp"
            checked={s.collect_whatsapp ?? true}
            onChange={(v) => setSettings({ collect_whatsapp: v })}
          />
        </div>
      </Section>

      <Section title="Categorias de pontuação">
        <p className="text-xs text-slate-500">
          Defina as categorias que as respostas pontuam (ex.:{' '}
          <code className="rounded bg-slate-100 px-1">comunicacao</code>,{' '}
          <code className="rounded bg-slate-100 px-1">lideranca</code>). Os
          resultados usam essas categorias para decidir qual mostrar. Para um
          funil de faixa única, use uma só categoria (ex.:{' '}
          <code className="rounded bg-slate-100 px-1">score</code>).
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.length === 0 && (
            <span className="text-sm text-slate-400">
              Nenhuma categoria ainda.
            </span>
          )}
          {categories.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
            >
              {c}
              <button
                onClick={() => removeCategory(c)}
                className="text-emerald-400 hover:text-emerald-700"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCategory()
              }
            }}
            className={inputCls}
            placeholder="Nome da categoria e Enter"
          />
          <button
            type="button"
            onClick={addCategory}
            className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Adicionar
          </button>
        </div>
      </Section>

      <Section title="Integração (webhook)">
        <Field
          label="URL do webhook"
          hint="Ao finalizar o quiz, enviamos um POST com os dados do lead + respostas + resultado para esta URL. Deixe em branco para desativar."
        >
          <input
            value={draft.webhook_url ?? ''}
            onChange={(e) => setDraft({ ...draft, webhook_url: e.target.value })}
            className={inputCls}
            placeholder="https://seu-crm.com/webhook/quiz"
          />
        </Field>
      </Section>

      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 py-4 text-sm text-slate-400">
        <span>As alterações são salvas automaticamente.</span>
        <SaveBadge state={saveState} />
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
      />
      {label}
    </label>
  )
}
