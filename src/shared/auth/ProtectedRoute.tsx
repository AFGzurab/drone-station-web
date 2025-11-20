// src/shared/auth/ProtectedRoute.tsx
import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

type Props = {
  children: ReactElement
  requireRole?: 'admin' | 'operator'
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Пока контекст авторизации ещё грузится
  if (loading) {
    return (
      <div className="text-slate-300 text-center mt-10">
        Загрузка…
      </div>
    )
  }

  // Пользователь не авторизован
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Нет нужной роли
  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/stations" replace />
  }

  return children
}
