'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { Quiz } from '@/types'
import { listQuizzes, createQuiz, deleteQuiz } from '@/lib/quizzes'
import { slugify } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'

export function QuizzesView() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  async function load() {
    try {
      setQuizzes(await listQuizzes())
    } catch (e: unknown) {
      toast.error('Erro ao carregar quizzes: ' + errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(q: Quiz) {
    if (
      !confirm(
        `Excluir o quiz "${q.name}"? Isso apaga perguntas, resultados e leads dele. Ação irreversível.`
      )
    )
      return
    try {
      await deleteQuiz(q.id)
      setQuizzes((prev) => prev.filter((x) => x.id !== q.id))
      toast.success('Quiz excluído.')
    } catch (e: unknown) {
      toast.error('Erro ao excluir: ' + errMsg(e))
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quizzes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Seus funis interativos.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          + Novo quiz
        </button>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-slate-500">Carregando…</p>
        ) : quizzes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">
              Nenhum quiz ainda. Crie o primeiro.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Link público</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quizzes.map((q, i) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-400">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/quizzes/${q.id}`}
                        className="font-medium text-slate-900 hover:text-emerald-600"
                      >
                        {q.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        Tipo {q.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/q/${q.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                        title="Abrir o quiz em nova aba"
                      >
                        /q/{q.slug} ↗
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(q)}
                        className="text-xs text-slate-400 transition hover:text-red-500"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && (
        <CreateQuizModal
          onClose={() => setCreating(false)}
          onCreated={(q) => {
            setQuizzes((prev) => [q, ...prev])
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: Quiz['status'] }) {
  return status === 'active' ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      Ativo
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
      Rascunho
    </span>
  )
}

function CreateQuizModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (q: Quiz) => void
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [type, setType] = useState<Quiz['type']>('A')
  const [slugEdited, setSlugEdited] = useState(false)
  const [saving, setSaving] = useState(false)

  function onNameChange(v: string) {
    setName(v)
    if (!slugEdited) setSlug(slugify(v))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) {
      toast.error('Preencha nome e slug.')
      return
    }
    setSaving(true)
    try {
      const q = await createQuiz({ name: name.trim(), slug: slug.trim(), type })
      toast.success('Quiz criado.')
      onCreated(q)
    } catch (e: unknown) {
      const msg = errMsg(e)
      toast.error(
        msg.includes('duplicate') || msg.includes('unique')
          ? 'Já existe um quiz com esse slug.'
          : 'Erro ao criar: ' + msg
      )
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Novo quiz">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome">
          <input
            autoFocus
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className={inputCls}
            placeholder="Ex.: Diagnóstico de Comunicação"
          />
        </Field>
        <Field label="Slug (URL pública)">
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-400">/q/</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugEdited(true)
                setSlug(slugify(e.target.value))
              }}
              className={inputCls}
              placeholder="diagnostico-comunicacao"
            />
          </div>
        </Field>
        <Field label="Tipo de funil">
          <div className="grid grid-cols-2 gap-2">
            <TypeCard
              active={type === 'A'}
              onClick={() => setType('A')}
              title="Tipo A"
              desc="Diagnóstico / captura de lead"
            />
            <TypeCard
              active={type === 'B'}
              onClick={() => setType('B')}
              title="Tipo B"
              desc="Qualificação para oferta"
            />
          </div>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            {saving ? 'Criando…' : 'Criar quiz'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function TypeCard({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition ${
        active
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-0.5 text-xs text-slate-500">{desc}</div>
    </button>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'

function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e)
    return String((e as { message: unknown }).message)
  return String(e)
}
