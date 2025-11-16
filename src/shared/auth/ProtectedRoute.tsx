// src/shared/auth/ProtectedRoute.tsx
import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

type Props = {
  children: ReactElement
  requireRole?: 'admin' | 'operator'
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { user } = useAuth()
  const location = useLocation()

  // не залогинен → на /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // есть требуемая роль и она не совпадает
  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/stations" replace />
  }

  return children
}