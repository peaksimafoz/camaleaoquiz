import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export default async function Home() {
  // Modo demonstração: sem Supabase, vai direto para o painel.
  if (!isSupabaseConfigured()) redirect('/dashboard')

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  redirect(user ? '/dashboard' : '/login')
}
