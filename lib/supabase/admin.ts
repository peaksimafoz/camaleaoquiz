import { createClient } from '@supabase/supabase-js'

// Client com service role key — ignora RLS. Usado SOMENTE em rotas de API que
// rodam sem sessão de usuário (ex.: as rotas públicas do quiz em /api/public/*).
// NUNCA importar isso em código client-side: a service role key é secreta.
//
// `cache: 'no-store'` no fetch: sem isso, o Next cacheia as leituras (Data Cache,
// que a Vercel persiste entre deploys) e a página pública passa a servir dados
// velhos — ex.: settings do quiz alterados no banco não apareciam. Com no-store,
// toda leitura pública busca o dado atual.
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  )
}
