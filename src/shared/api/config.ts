// src/shared/api/config.ts
//
// Общая конфигурация приложения:
// - режим работы: demo / server
// - базовый URL API для серверного режима

export type AppMode = 'demo' | 'server'

// читаем из Vite-окружения: VITE_APP_MODE=demo | server
const rawMode = import.meta.env.VITE_APP_MODE as AppMode | undefined

// по умолчанию всегда демо-режим
export const APP_MODE: AppMode = rawMode === 'server' ? 'server' : 'demo'

// базовый URL для запросов к реальному серверу
// можно переопределить в .env: VITE_API_BASE_URL=https://example.com/api
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:3000/api'

// удобные флаги
export const isDemoMode = APP_MODE === 'demo'
export const isServerMode = APP_MODE === 'server'
