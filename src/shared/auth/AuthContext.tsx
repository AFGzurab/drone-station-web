// src/shared/auth/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { fakeLogin, getSavedUser, clearUser } from './auth'
import type { User } from './auth'
import type { ReactNode } from 'react'

// Что лежит в контексте
type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

// Сам контекст
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Провайдер
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // При первом рендере пробуем достать юзера из localStorage
  useEffect(() => {
    const saved = getSavedUser()
    if (saved) {
      setUser(saved)
    }
    setLoading(false)
  }, [])

  // Логин
  async function login(username: string, password: string) {
    const loggedIn = await fakeLogin(username, password)
    setUser(loggedIn)
  }

  // Логаут
  function logout() {
    clearUser()
    setUser(null)
  }

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Хук
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
