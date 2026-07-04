// Extrai uma mensagem legível de um erro desconhecido (ex.: erro do Supabase).
export function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e)
    return String((e as { message: unknown }).message)
  return String(e)
}
