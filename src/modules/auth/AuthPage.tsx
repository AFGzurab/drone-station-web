// src/modules/auth/AuthPage.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'

export function AuthPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // куда возвращать после логина
  const from = location.state?.from?.pathname || '/stations'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-48px)] flex items-center justify-center bg-slate-900 text-white">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-semibold mb-4 text-center">
          Вход в систему
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Логин</label>
            <input
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin или operator"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Пароль</label>
            <input
              type="password"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123 или op123"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-sm font-medium transition"
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>

          <p className="text-xs text-slate-400 mt-2">
            Тестовые аккаунты:
            <br />
            admin / admin123 (админ)
            <br />
            operator / op123 (оператор)
          </p>
        </form>
      </div>
    </div>
  )
}