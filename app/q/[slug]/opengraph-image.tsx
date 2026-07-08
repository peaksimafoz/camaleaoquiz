import { ImageResponse } from 'next/og'

// Runtime edge: no nodejs (Windows), o @vercel/og falha ao carregar a fonte por
// causa do caminho com acento/espaço ("Área de Trabalho"). No edge funciona.
export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Felipe Felipetti'

interface QuizSettings {
  primary_color?: string
}

async function fetchQuiz(slug: string): Promise<{ settings: QuizSettings } | null> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quizzes?slug=eq.${encodeURIComponent(
    slug
  )}&status=eq.active&select=settings`
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

// Preview de link: SÓ o ícone da marca (sem texto embutido, para não distorcer
// na miniatura do WhatsApp). O título/descrição vêm das meta tags (generateMetadata).
export default async function Image({
  params,
}: {
  params: { slug: string }
}) {
  const quiz = await fetchQuiz(params.slug)
  const primary = quiz?.settings?.primary_color || '#10b981'
  const icon =
    'https://inatzqvwxlsbmhxwycvq.supabase.co/storage/v1/object/public/assets/felipe-icon.png'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" height={320} />
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 16,
            background: primary,
          }}
        />
      </div>
    ),
    { ...size }
  )
}
