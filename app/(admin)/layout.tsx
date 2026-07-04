import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const configured = isSupabaseConfigured()

  // Modo demonstração: sem Supabase, entra como usuário fictício e mostra banner.
  let email = 'demo@camaleaoquiz.local'
  if (configured) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    email = user.email ?? ''
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar email={email} />
      <main className="flex-1 overflow-y-auto">
        {!configured && (
          <div className="border-b border-amber-200 bg-amber-50 px-8 py-2 text-center text-xs text-amber-800">
            Modo demonstração — configure o Supabase (.env.local) para habilitar
            login e dados reais.
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
