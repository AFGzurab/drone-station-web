// src/shared/auth/auth.ts

export type UserRole = 'admin' | 'operator'

export type User = {
  username: string
  role: UserRole
}

const STORAGE_KEY = 'dsw_user'

// Фейковые пользователи
const USERS: Array<{ username: string; password: string; role: UserRole }> = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'operator', password: 'op123', role: 'operator' },
]

// Имитируем запрос логина
export async function fakeLogin(username: string, password: string): Promise<User> {
  await new Promise((res) => setTimeout(res, 300)) // задержка как сеть

  const found = USERS.find(
    (u) => u.username === username && u.password === password,
  )

  if (!found) {
    throw new Error('Неверный логин или пароль')
  }

  const user: User = { username: found.username, role: found.role }
  saveUser(user)
  return user
}

export function saveUser(user: User) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function getSavedUser(): User | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function clearUser() {
  localStorage.removeItem(STORAGE_KEY)
}