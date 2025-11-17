// src/shared/api/stations.ts

import { DRONES } from './drones'

export type StationStatus = 'online' | 'offline' | 'error'

export type Station = {
  id: string
  name: string
  status: StationStatus
  // Координаты станции (для списка, карты и деталей)
  coords: {
    lat: number
    lng: number
  }
  // Дроны: активные / всего
  dronesActive: number
  dronesTotal: number
  // Средний заряд по станции
  batteryAvg: number
  // Оставляем batteryLevel для обратной совместимости (admin/старый код)
  batteryLevel?: number
}

// Команды станции (фейковые)
export type StationCommand = 'send' | 'return' | 'restart'

export async function sendStationCommand(
  stationId: string,
  command: StationCommand,
): Promise<{ message: string }> {
  // Фейковая задержка, имитация запроса к API
  await new Promise((resolve) => setTimeout(resolve, 500))

  let message = 'Команда выполнена (фейк).'

  switch (command) {
    case 'send':
      message = 'Команда отправки дрона на задание выполнена (фейк).'
      break
    case 'return':
      message = 'Команда возврата дрона на станцию выполнена (фейк).'
      break
    case 'restart':
      message = 'Команда перезапуска станции выполнена (фейк).'
      break
  }

  console.log('[sendStationCommand]', { stationId, command, message })
  return { message }
}

// -------------------- Вспомогательная логика по дронам --------------------

function getDroneStats(stationId: string) {
  const list = DRONES.filter((d) => d.stationId === stationId)
  const active = list.filter(
    (d) => d.status === 'on_mission' || d.status === 'returning',
  ).length

  return {
    active,
    total: list.length,
  }
}

// -------------------- Мок-данные --------------------

const mockStations: Station[] = [
  (() => {
    const stats = getDroneStats('st-1')
    return {
      id: 'st-1',
      name: 'Станция №1 — Северная',
      status: 'online',
      coords: { lat: 55.03, lng: 82.92 },
      dronesActive: stats.active,
      dronesTotal: stats.total,
      batteryAvg: 82,
      batteryLevel: 82,
    }
  })(),
  (() => {
    const stats = getDroneStats('st-2')
    return {
      id: 'st-2',
      name: 'Станция №2 — Восточная',
      status: 'offline',
      coords: { lat: 54.98, lng: 83.05 },
      dronesActive: stats.active,
      dronesTotal: stats.total,
      batteryAvg: 56,
      batteryLevel: 56,
    }
  })(),
  (() => {
    const stats = getDroneStats('st-3')
    return {
      id: 'st-3',
      name: 'Станция №3 — Южная',
      status: 'error',
      coords: { lat: 54.9, lng: 82.95 },
      dronesActive: stats.active,
      dronesTotal: stats.total,
      batteryAvg: 34,
      batteryLevel: 34,
    }
  })(),
]

// Получить все станции
export async function fetchStations(): Promise<Station[]> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  return mockStations
}

// Получить одну станцию по id
export async function fetchStationById(id: string): Promise<Station | null> {
  await new Promise((resolve) => setTimeout(resolve, 120))
  const station = mockStations.find((s) => s.id === id)
  return station ?? null
}
