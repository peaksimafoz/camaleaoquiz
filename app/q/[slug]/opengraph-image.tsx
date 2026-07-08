import { ImageResponse } from 'next/og'

// Runtime edge: no nodejs (Windows), o @vercel/og falha ao carregar a fonte por
// causa do caminho com acento/espaço ("Área de Trabalho"). No edge funciona.
export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Quiz'

interface QuizSettings {
  intro_title?: string
  intro_subtitle?: string
  logo_url?: string
  primary_color?: string
}

// Busca os dados do quiz via PostgREST (fetch puro, compatível com edge).
async function fetchQuiz(
  slug: string
): Promise<{ name: string; settings: QuizSettings } | null> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quizzes?slug=eq.${encodeURIComponent(
    slug
  )}&status=eq.active&select=name,settings`
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  try {
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const rows = await res.json()
    return rows[0] ?? null
  } catch {
    return null
  }
}

export default async function Image({
  params,
}: {
  params: { slug: string }
}) {
  const quiz = await fetchQuiz(params.slug)
  const s = quiz?.settings ?? {}
  const title = s.intro_title || quiz?.name || 'Descubra seu resultado'
  const subtitle = s.intro_subtitle || ''
  const primary = s.primary_color || '#10b981'
  // Só o ícone da marca (o balão), sem o texto "Felipe Felipetti".
  const icon =
    'https://inatzqvwxlsbmhxwycvq.supabase.co/storage/v1/object/public/assets/felipe-icon.png'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          padding: '72px 80px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" height={180} style={{ marginBottom: 44 }} />
        <div
          style={{
            display: 'flex',
            fontSize: 58,
            fontWeight: 700,
            color: '#0f172a',
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: 'flex',
              fontSize: 30,
              color: '#475569',
              textAlign: 'center',
              marginTop: 24,
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            {subtitle.length > 130 ? subtitle.slice(0, 127) + '…' : subtitle}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 14,
            background: primary,
          }}
        />
      </div>
    ),
    { ...size }
  )
}
