// Detecta se as variáveis do Supabase estão configuradas. Quando NÃO estão
// (ex.: rodando localmente sem .env.local), o app entra em "modo demonstração":
// o middleware libera todas as rotas e o painel renderiza sem exigir login.
// Em produção (Vercel) as variáveis sempre existem, então o modo demo nunca ativa.
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
