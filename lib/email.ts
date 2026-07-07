import 'server-only'
import nodemailer from 'nodemailer'

// Envio de e-mail via Gmail SMTP (App Password). Configurado por env:
//   GMAIL_USER           → endereço que envia (ex.: camaleaodacomunicacao@gmail.com)
//   GMAIL_APP_PASSWORD   → senha de app de 16 caracteres
// Se as env não existirem, o envio é simplesmente pulado (não quebra o submit).
//
// Deliverability: NÃO anexamos o PDF (anexo é forte gatilho de spam) — o e-book
// vai como um botão de download. O texto é pessoal/entrega, com o convite ao
// produto discreto no rodapé.

export function emailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

let cached: nodemailer.Transporter | null = null
function transporter() {
  if (!cached) {
    cached = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
      },
    })
  }
  return cached
}

export interface ResultEmail {
  to: string
  name?: string | null
  quizName: string
  resultName?: string | null
  resultText?: string | null
  ctaLabel?: string | null
  ctaUrl?: string | null
  subject?: string | null
  ebookUrl?: string | null
  primaryColor?: string
}

export async function sendResultEmail(o: ResultEmail): Promise<void> {
  const subject =
    (o.subject && o.subject.trim()) ||
    `Seu resultado: ${o.resultName || o.quizName}`

  await transporter().sendMail({
    from: `"Felipe Felipetti" <${process.env.GMAIL_USER}>`,
    to: o.to,
    subject,
    html: renderHtml(o, o.primaryColor || '#10b981'),
  })
}

function esc(s?: string | null): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderHtml(o: ResultEmail, color: string): string {
  const greeting = o.name ? `Oi, ${esc(o.name)}! 👋` : 'Oi! 👋'
  const resultName = esc(o.resultName || o.quizName)

  const download = o.ebookUrl
    ? `<div style="margin:24px 0;">
         <a href="${esc(o.ebookUrl)}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">📘 Baixar minha apostila</a>
       </div>`
    : ''

  const courseInvite =
    o.ctaUrl && o.ctaLabel
      ? `<p style="font-size:14px;line-height:1.6;color:#64748b;margin:24px 0 0;">Quer se aprofundar nesse ponto? Dei um jeito prático nisso no curso <strong>Camaleão da Comunicação</strong>. <a href="${esc(o.ctaUrl)}" style="color:${color};text-decoration:underline;">${esc(o.ctaLabel)}</a></p>`
      : ''

  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f1f5f9;padding:24px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
    <p style="font-size:16px;color:#0f172a;margin:0 0 16px;">${greeting}</p>
    <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 4px;">Aqui está o seu resultado:</p>
    <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">${resultName}</h1>
    <p style="font-size:15px;line-height:1.6;color:#334155;margin:0;">Preparei uma apostila que vai te ajudar exatamente com isso. É só baixar no botão abaixo. 👇</p>
    ${download}
    ${courseInvite}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px;">
    <p style="font-size:12px;color:#94a3b8;margin:0;">Você recebeu este e-mail porque respondeu a um quiz do Felipe Felipetti.</p>
  </div>
</body></html>`
}
