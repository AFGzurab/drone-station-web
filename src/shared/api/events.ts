// src/shared/api/events.ts

// ==== Типы уровней и источников событий ====

export type SystemEventLevel = 'info' | 'warning' | 'error'

export type SystemEventSource =
  | 'operator'
  | 'admin'
  | 'system'
  | 'monitoring'
  | 'security'
  | 'service'

// Основной тип события, который будем показывать в админке
export type SystemEvent = {
  id: number
  time: string        // строка для отображения (2025-11-16 21:05)
  timestamp: number   // реальный ms-сштамп для сортировок
  title: string
  source: SystemEventSource
  level: SystemEventLevel
}

// Тип для добавления нового события извне
export type NewSystemEvent = {
  title: string
  level?: SystemEventLevel
  source?: SystemEventSource
  timestamp?: number
}

// Максимальное число хранимых событий
const MAX_EVENTS = 300

let eventsStore: SystemEvent[] = []
let lastId = 1

type EventsListener = (event: SystemEvent) => void
const listeners = new Set<EventsListener>()

// ----------------------------------------
// Вспомогательные функции
// ----------------------------------------

// Формат "2025-11-16 21:05"
function formatTimestamp(ts: number): string {
  const d = new Date(ts)

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// ----------------------------------------
// Публичный API
// ----------------------------------------

// Добавить новое системное событие
export function logSystemEvent(input: NewSystemEvent): SystemEvent {
  const timestamp = input.timestamp ?? Date.now()

  const event: SystemEvent = {
    id: lastId++,
    timestamp,
    time: formatTimestamp(timestamp),
    title: input.title,
    level: input.level ?? 'info',
    source: input.source ?? 'system',
  }

  // добавляем в конец, но храним только последние MAX_EVENTS
  eventsStore.push(event)
  if (eventsStore.length > MAX_EVENTS) {
    eventsStore = eventsStore.slice(-MAX_EVENTS)
  }

  // уведомляем подписчиков о новом событии
  listeners.forEach((listener) => listener(event))

  return event
}

// Получить последние N событий (по умолчанию 50), в порядке "новые сверху"
export function getRecentEvents(limit = 50): SystemEvent[] {
  const slice = eventsStore.slice(-limit)
  return slice.reverse()
}

// Подписаться на поток событий.
// Коллбек вызывается ТОЛЬКО для новых событий.
// Возвращает функцию для отписки.
export function subscribeToEvents(listener: EventsListener): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}
