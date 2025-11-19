// src/shared/api/drones.ts

import { logSystemEvent } from './events'
import { getSavedUser } from '../auth/auth'
import {
  startFlightForDrone,
  abortFlightForDrone,
} from './flights'

// --------- Типы ---------

export type DroneStatus =
  | 'idle'
  | 'on_mission'
  | 'returning'
  | 'error'
  | 'offline'

export type Drone = {
  id: string
  code: string
  name: string
  stationId: string
  status: DroneStatus
  battery: number
  lastContact: string
  mission: string
}

export type DroneCommand =
  | 'send_on_mission'
  | 'return_to_station'
  | 'emergency_landing'

// Небольшая карта имён станций для красивого лога полётов
const STATION_NAME_BY_ID: Record<string, string> = {
  'st-1': 'Станция №1 — Северная',
  'st-2': 'Станция №2 — Восточная',
  'st-3': 'Станция №3 — Южная',
}

// -------------------- Мок-дроны --------------------

export const DRONES: Drone[] = [
  {
    id: 'dr-101',
    code: 'DR-101',
    name: 'Дрон DR-101',
    stationId: 'st-1',
    status: 'idle',
    battery: 86,
    lastContact: '1 минута назад',
    mission: 'Ожидание задания',
  },
  {
    id: 'dr-102',
    code: 'DR-102',
    name: 'Дрон DR-102',
    stationId: 'st-1',
    status: 'on_mission',
    battery: 63,
    lastContact: '30 секунд назад',
    mission: 'Обработка поля №12',
  },
  {
    id: 'dr-103',
    code: 'DR-103',
    name: 'Дрон DR-103',
    stationId: 'st-1',
    status: 'returning',
    battery: 47,
    lastContact: '2 минуты назад',
    mission: 'Возвращается на станцию',
  },
  {
    id: 'dr-201',
    code: 'DR-201',
    name: 'Дрон DR-201',
    stationId: 'st-2',
    status: 'offline',
    battery: 30,
    lastContact: '15 минут назад',
    mission: 'Ожидает подключения',
  },
  {
    id: 'dr-301',
    code: 'DR-301',
    name: 'Дрон DR-301',
    stationId: 'st-3',
    status: 'error',
    battery: 12,
    lastContact: '5 минут назад',
    mission: 'Ошибка телеметрии',
  },
]

// --------- вспомогалки ---------

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

// -------------------- REST-подобные функции --------------------

// Все дроны (для карты, админки и т.п.)
export async function fetchAllDrones(): Promise<Drone[]> {
  await delay(200)
  return DRONES
}

// Дроны по станции
export async function fetchDronesByStation(
  stationId: string,
): Promise<Drone[]> {
  await delay(200)
  return DRONES.filter((d) => d.stationId === stationId)
}

// Один дрон по id
export async function fetchDroneById(id: string): Promise<Drone | null> {
  await delay(200)
  const drone = DRONES.find((d) => d.id === id)
  return drone ?? null
}

// Отправка команды дрону (изменяем мок-данные + пишем события)
export async function sendDroneCommand(
  id: string,
  command: DroneCommand,
): Promise<{ success: boolean; message: string }> {
  await delay(500)

  const drone = DRONES.find((d) => d.id === id)
  const { label: actorLabel, source } = getCurrentUserContext()

  if (!drone) {
    const msg = `Попытка отправить команду "${command}" несуществующему дрону ${id}.`
    logSystemEvent({
      title: msg,
      level: 'error',
      source,
    })
    return { success: false, message: msg }
  }

  switch (command) {
    case 'send_on_mission': {
      drone.status = 'on_mission'
      drone.mission = 'Выполнение задания (симуляция)'
      drone.lastContact = 'несколько секунд назад'

      const msg = `Оператор ${actorLabel} запустил дрона ${drone.code} со станции ${drone.stationId}.`
      logSystemEvent({
        title: msg,
        level: 'info',
        source,
      })

      // 🔹 Стартуем полёт для этого дрона
      startFlightForDrone({
        droneId: drone.id,
        droneName: drone.name,
        stationId: drone.stationId,
        stationName: STATION_NAME_BY_ID[drone.stationId] ?? drone.stationId,
      })

      return {
        success: true,
        message: `Дрон ${id}: отправлен на задание (симуляция).`,
      }
    }

    case 'return_to_station': {
      drone.status = 'returning'
      drone.mission = 'Возвращается на станцию (симуляция)'
      drone.lastContact = 'несколько секунд назад'

      const msg = `Оператор ${actorLabel} отправил дрона ${drone.code} на возврат к станции ${drone.stationId}.`
      logSystemEvent({
        title: msg,
        level: 'info',
        source,
      })

      return {
        success: true,
        message: `Дрон ${id}: возвращается на станцию (симуляция).`,
      }
    }

    case 'emergency_landing': {
      // Экстренная посадка = прерванный полёт
      drone.status = 'idle'
      drone.mission = 'Экстренная посадка выполнена (симуляция)'
      drone.lastContact = 'несколько секунд назад'
      drone.battery = Math.max(0, drone.battery - 5)

      const msg = `Оператор ${actorLabel} выполнил экстренную посадку дрона ${drone.code}.`
      logSystemEvent({
        title: msg,
        level: 'warning',
        source,
      })

      // 🔹 Помечаем последний полёт этого дрона как прерванный
      abortFlightForDrone(drone.id, 'emergency_landing')

      return {
        success: true,
        message: `Дрон ${id}: выполнена экстренная посадка (симуляция).`,
      }
    }

    default: {
      const msg = `Дрон ${id}: неизвестная команда "${command}".`
      logSystemEvent({
        title: msg,
        level: 'error',
        source,
      })
      return {
        success: false,
        message: msg,
      }
    }
  }
}

// -------------------- Телеметрия (WebSocket-like) --------------------

export type TelemetryUnsubscribe = () => void
export type DroneTelemetryCallback = (drone: Drone) => void

// храним интервалы телеметрии по id дрона
const telemetryTimers = new Map<string, number>()

// чтобы не спамить одинаковыми событиями
const notifiedLowBattery = new Set<string>()
const notifiedError = new Set<string>()

/**
 * Подписка на "телеметрию" дрона.
 * Эмулирует WebSocket: периодически обновляет мок-данные и вызывает callback.
 */
export function subscribeToDroneTelemetry(
  droneId: string,
  callback: DroneTelemetryCallback,
): TelemetryUnsubscribe {
  const drone = DRONES.find((d) => d.id === droneId)

  if (!drone) {
    return () => {}
  }

  // сразу отдаём текущее состояние
  callback({ ...drone })

  // если уже есть таймер для этого дрона — чистим
  const existing = telemetryTimers.get(droneId)
  if (existing) {
    window.clearInterval(existing)
  }

  const timerId = window.setInterval(() => {
    const d = DRONES.find((x) => x.id === droneId)
    if (!d) return

    // лёгкая симуляция изменения батареи и статуса
    if (d.status === 'on_mission' || d.status === 'returning') {
      const delta = Math.floor(Math.random() * 3) + 1 // 1–3%
      d.battery = Math.max(0, d.battery - delta)
      d.lastContact = 'несколько секунд назад'

      // предупреждение о низком заряде
      if (d.battery <= 30 && !notifiedLowBattery.has(d.id)) {
        notifiedLowBattery.add(d.id)
        logSystemEvent({
          level: 'warning',
          source: 'monitoring',
          title: `Низкий заряд дрона ${d.code} во время полёта (${d.battery}%)`,
        })
      }

      // переход в статус ошибка при критическом заряде
      if (d.battery <= 10 && (d.status as DroneStatus) !== 'error') {
        d.status = 'error'
        d.mission = 'Критический уровень заряда (симуляция)'

        if (!notifiedError.has(d.id)) {
          notifiedError.add(d.id)
          logSystemEvent({
            level: 'error',
            source: 'monitoring',
            title: `Дрон ${d.code} перешёл в статус "Ошибка" из-за критического заряда (${d.battery}%)`,
          })
        }
      }
    } else if (d.status === 'idle') {
      d.lastContact = '1 минуту назад'
    }

    // отдаём копию объекта, чтобы не мутировать состояние React напрямую
    callback({ ...d })
  }, 4000) // раз в 4 секунды

  telemetryTimers.set(droneId, timerId)

  return () => {
    const t = telemetryTimers.get(droneId)
    if (t) {
      window.clearInterval(t)
      telemetryTimers.delete(droneId)
    }
  }
}
