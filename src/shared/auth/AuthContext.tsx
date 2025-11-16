// src/shared/auth/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react'
import { fakeLogin, getSavedUser, clearUser } from './auth'
import type { User } from './auth'
import type { ReactNode } from 'react'

type AuthContextValue = {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // при загрузке пробуем восстановить юзера
  useEffect(() => {
    const saved = getSavedUser()
    if (saved) setUser(saved)
  }, [])

  async function login(username: string, password: string) {
    const loggedIn = await fakeLogin(username, password)
    setUser(loggedIn)
  }

  function logout() {
    clearUser()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}