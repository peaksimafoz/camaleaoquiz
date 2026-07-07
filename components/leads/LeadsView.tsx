'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Quiz } from '@/types'
import { listQuizzes } from '@/lib/quizzes'
import { listLeads, type LeadRow } from '@/lib/leads'
import { errMsg } from '@/lib/err'
import { selectCls } from '@/components/ui/form'

export function LeadsView() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [quizId, setQuizId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listQuizzes()
      .then(setQuizzes)
      .catch((e) => toast.error('Erro ao carregar quizzes: ' + errMsg(e)))
  }, [])

  useEffect(() => {
    setLoading(true)
    listLeads(quizId || undefined)
      .then(setLeads)
      .catch((e) => toast.error('Erro ao carregar leads: ' + errMsg(e)))
      .finally(() => setLoading(false))
  }, [quizId])

  function exportCsv() {
    const headers = [
      'Data',
      'Nome',
      'E-mail',
      'WhatsApp',
      'Instagram',
      'Quiz',
      'Resultado',
    ]
    const rows = leads.map((l) => [
      new Date(l.created_at).toLocaleString('pt-BR'),
      l.name ?? '',
      l.email ?? '',
      l.whatsapp ?? '',
      l.instagram ?? '',
      l.quizzes?.name ?? '',
      l.results?.name ?? '',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map(csvCell).join(','))
      .join('\r\n')
    // BOM para o Excel abrir acentos corretamente
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pessoas que preencheram seus quizzes.
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={leads.length === 0}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          ↓ Exportar CSV
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <label className="text-sm text-slate-600">Filtrar por quiz:</label>
        <select
          value={quizId}
          onChange={(e) => setQuizId(e.target.value)}
          className={selectCls + ' w-auto'}
        >
          <option value="">Todos os quizzes</option>
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-400">
          {leads.length} lead{leads.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-500">Carregando…</p>
        ) : leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Nenhum lead ainda.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">WhatsApp</th>
                  <th className="px-4 py-3 font-medium">Instagram</th>
                  <th className="px-4 py-3 font-medium">Quiz</th>
                  <th className="px-4 py-3 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {new Date(l.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{l.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.whatsapp || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.instagram || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.quizzes?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {l.results?.name ? (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          {l.results.name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Escapa um valor para CSV (aspas + separadores + quebras de linha).
function csvCell(v: string): string {
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}
