import { createClient } from '@supabase/supabase-js'

// Client com service role key — ignora RLS. Usado SOMENTE em rotas de API que
// rodam sem sessão de usuário (ex.: as rotas públicas do quiz em /api/public/*).
// NUNCA importar isso em código client-side: a service role key é secreta.
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
