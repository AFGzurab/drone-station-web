// src/shared/api/stations.ts

import { logSystemEvent } from './events'
import { getSavedUser } from '../auth/auth'
import { DRONES } from './drones'

// ------------------------------------
// Типы
// ------------------------------------

export type StationStatus = 'online' | 'offline' | 'error'

export type Station = {
  id: string
  name: string
  coords: { lat: number; lng: number }
  status: StationStatus
  dronesActive: number
  dronesTotal: number
  batteryAvg?: number
  batteryLevel?: number
}

// ------------------------------------
// Вспомогалки
// ------------------------------------

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getCurrentUserContext() {
  const user = getSavedUser()
  if (!user) {
    return {
      label: 'Система',
      source: 'system' as const,
    }
  }

  return {
    label: `${user.username} (${user.role})`,
    source: user.role as 'admin' | 'operator',
  }
}

// ------------------------------------
// Мок-станции (базовые данные)
// dronesActive / dronesTotal будут
// пересчитаны динамически при запросе
// ------------------------------------

export const STATIONS: Station[] = [
  {
    id: 'st-1',
    name: 'Станция №1 — Северная',
    coords: { lat: 55.03, lng: 82.92 },
    status: 'online',
    dronesActive: 2,
    dronesTotal: 3,
    batteryAvg: 65,
  },
  {
    id: 'st-2',
    name: 'Станция №2 — Восточная',
    coords: { lat: 55.04, lng: 82.98 },
    status: 'offline',
    dronesActive: 0,
    dronesTotal: 1,
    batteryAvg: 20,
  },
  {
    id: 'st-3',
    name: 'Станция №3 — Южная',
    coords: { lat: 55.0, lng: 82.9 },
    status: 'error',
    dronesActive: 0,
    dronesTotal: 1,
    batteryAvg: 12,
  },
]

// ------------------------------------
// Пересчёт дронов по станции
// ------------------------------------

function recomputeDronesForStation(stationId: string) {
  const stationDrones = DRONES.filter((d) => d.stationId === stationId)

  const dronesTotal = stationDrones.length
  const dronesActive = stationDrones.filter((d) =>
    d.status === 'on_mission' || d.status === 'returning'
  ).length

  return { dronesActive, dronesTotal }
}

// ------------------------------------
// REST functions
// ------------------------------------

export async function fetchStations(): Promise<Station[]> {
  await delay(200)

  // каждый раз возвращаем актуальные значения по дронам
  return STATIONS.map((st) => {
    const { dronesActive, dronesTotal } = recomputeDronesForStation(st.id)
    return {
      ...st,
      dronesActive,
      dronesTotal,
    }
  })
}

export async function fetchStationById(id: string): Promise<Station | null> {
  await delay(200)
  const base = STATIONS.find((s) => s.id === id)
  if (!base) return null

  const { dronesActive, dronesTotal } = recomputeDronesForStation(base.id)

  return {
    ...base,
    dronesActive,
    dronesTotal,
  }
}

// ------------------------------------
// Команда станции + системные события
// ------------------------------------

export async function sendStationCommand(
  id: string,
  command: 'restart',
): Promise<{ success: boolean; message: string }> {
  await delay(500)

  const station = STATIONS.find((s) => s.id === id)
  const { label: actorLabel, source } = getCurrentUserContext()

  if (!station) {
    const message = `Попытка выполнить команду "${command}" для несуществующей станции ${id}.`

    logSystemEvent({
      title: message,
      level: 'error',
      source,
    })

    return {
      success: false,
      message,
    }
  }

  switch (command) {
    case 'restart': {
      // Логируем системное событие
      logSystemEvent({
        title: `Оператор ${actorLabel} перезапустил станцию ${station.name}.`,
        level: 'info',
        source,
      })

      // слегка изменим состояние станции (симуляция)
      station.status = 'online'
      station.batteryAvg = Math.min(100, (station.batteryAvg ?? 0) + 5)

      return {
        success: true,
        message: `Станция ${station.name} успешно перезапущена (симуляция).`,
      }
    }

    default: {
      const message = `Станция ${id}: неизвестная команда "${command}".`

      logSystemEvent({
        title: message,
        level: 'error',
        source,
      })

      return {
        success: false,
        message,
      }
    }
  }
}

// ------------------------------------
// Смена статуса станции = событие
// ------------------------------------

export function updateStationStatus(id: string, newStatus: StationStatus) {
  const st = STATIONS.find((s) => s.id === id)

  if (!st) return

  if (st.status !== newStatus) {
    // Логируем событие при смене статуса
    logSystemEvent({
      title: `Статус станции ${st.name} изменён: ${st.status} → ${newStatus}.`,
      level:
        newStatus === 'online'
          ? 'info'
          : newStatus === 'offline'
          ? 'warning'
          : 'error',
      source: 'system',
    })

    st.status = newStatus
  }
}
