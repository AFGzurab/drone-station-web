// src/shared/api/stations.ts

import { DRONES, type Drone } from './drones'

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

// -------------------- Базовые мок-станции --------------------

const baseStations: Station[] = [
  {
    id: 'st-1',
    name: 'Станция №1 — Северная',
    status: 'online',
    coords: { lat: 55.03, lng: 82.92 },
    dronesActive: 0,
    dronesTotal: 0,
    batteryAvg: 0,
  },
  {
    id: 'st-2',
    name: 'Станция №2 — Восточная',
    status: 'offline',
    coords: { lat: 54.98, lng: 83.05 },
    dronesActive: 0,
    dronesTotal: 0,
    batteryAvg: 0,
  },
  {
    id: 'st-3',
    name: 'Станция №3 — Южная',
    status: 'error',
    coords: { lat: 54.9, lng: 82.95 },
    dronesActive: 0,
    dronesTotal: 0,
    batteryAvg: 0,
  },
]

// ---------- Вспомогалка для пересчёта агрегатов по дронам ----------

function computeAggregatesForStation(stationId: string) {
  const drones: Drone[] = DRONES.filter((d) => d.stationId === stationId)

  const dronesTotal = drones.length
  const dronesActive = drones.filter((d) =>
    ['on_mission', 'returning'].includes(d.status),
  ).length

  const batteryAvg =
    dronesTotal > 0
      ? Math.round(drones.reduce((sum, d) => sum + d.battery, 0) / dronesTotal)
      : 0

  return { dronesTotal, dronesActive, batteryAvg }
}

function buildStationWithAggregates(base: Station): Station {
  const { dronesTotal, dronesActive, batteryAvg } =
    computeAggregatesForStation(base.id)

  return {
    ...base,
    dronesTotal,
    dronesActive,
    batteryAvg,
    batteryLevel: batteryAvg, // чтобы старый код, который смотрит на batteryLevel, тоже работал
  }
}

// Получить все станции
export async function fetchStations(): Promise<Station[]> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  return baseStations.map(buildStationWithAggregates)
}

// Получить одну станцию по id
export async function fetchStationById(id: string): Promise<Station | null> {
  await new Promise((resolve) => setTimeout(resolve, 120))
  const base = baseStations.find((s) => s.id === id)
  if (!base) return null
  return buildStationWithAggregates(base)
}
