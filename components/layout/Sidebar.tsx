'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/quizzes', label: 'Quizzes', icon: '🧩' },
]

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-5">
        <span className="text-lg font-bold text-slate-900">
          camaleão<span className="text-emerald-500">quiz</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="truncate px-2 text-xs text-slate-500">{email}</div>
        <button
          onClick={logout}
          className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-100"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
