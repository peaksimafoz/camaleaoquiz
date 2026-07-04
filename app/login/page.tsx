import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            camaleão<span className="text-emerald-500">quiz</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Painel administrativo</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
