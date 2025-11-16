// src/modules/auth/AuthPage.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'

type LocationState = {
  from?: { pathname: string }
}

export function AuthPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const from =
    (location.state as LocationState | undefined)?.from?.pathname || '/stations'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError('Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      {/* 4rem — высота шапки, чтобы центр был “под хедером” */}
      <div className="w-full max-w-md px-4">
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl shadow-xl px-8 py-10">
          <h1 className="text-2xl font-semibold text-slate-50 text-center">
            Вход в систему
          </h1>
          <p className="mt-2 text-sm text-slate-400 text-center">
            Авторизация оператора или администратора дрон-станций.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Логин
              </label>
              <input
                type="text"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="admin или operator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Пароль
              </label>
              <input
                type="password"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="admin123 или op123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-sm text-rose-400 bg-rose-950/40 border border-rose-700/50 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 disabled:hover:bg-sky-500 transition text-white font-medium"
            >
              {loading ? 'Входим…' : 'Войти'}
            </button>
          </form>

          <p className="mt-5 text-xs text-slate-500">
            <span className="block">Тестовые аккаунты:</span>
            <span className="block mt-1">
              admin / <span className="font-mono">admin123</span> (админ)
            </span>
            <span className="block">
              operator / <span className="font-mono">op123</span> (оператор)
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}