// src/shared/api/drones.ts

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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// -------------------- REST-подобные функции --------------------

// Все дроны (для карты, админки и т.п.)
export async function fetchAllDrones(): Promise<Drone[]> {
  await delay(200)
  return DRONES
}

// Дроны по станции
export async function fetchDronesByStation(stationId: string): Promise<Drone[]> {
  await delay(200)
  return DRONES.filter((d) => d.stationId === stationId)
}

// Один дрон по id
export async function fetchDroneById(id: string): Promise<Drone | null> {
  await delay(200)
  const drone = DRONES.find((d) => d.id === id)
  return drone ?? null
}

// Отправка команды дрону (фейк + изменение состояния в мок-данных)
export async function sendDroneCommand(
  id: string,
  command: DroneCommand,
): Promise<{ success: boolean; message: string }> {
  await delay(500)

  const drone = DRONES.find((d) => d.id === id)

  switch (command) {
    case 'send_on_mission':
      if (drone) {
        drone.status = 'on_mission'
        drone.mission = 'Выполнение задания (симуляция)'
        drone.lastContact = 'несколько секунд назад'
      }
      return {
        success: true,
        message: `Дрон ${id}: отправлен на задание (фейк).`,
      }

    case 'return_to_station':
      if (drone) {
        drone.status = 'returning'
        drone.mission = 'Возвращается на станцию (симуляция)'
        drone.lastContact = 'несколько секунд назад'
      }
      return {
        success: true,
        message: `Дрон ${id}: возвращается на станцию (фейк).`,
      }

    case 'emergency_landing':
      if (drone) {
        drone.status = 'idle'
        drone.mission = 'Экстренная посадка выполнена (симуляция)'
        drone.lastContact = 'несколько секунд назад'
        // немного просаживаем батарею
        drone.battery = Math.max(0, drone.battery - 5)
      }
      return {
        success: true,
        message: `Дрон ${id}: выполнена экстренная посадка (фейк).`,
      }

    default:
      return {
        success: false,
        message: `Дрон ${id}: неизвестная команда.`,
      }
  }
}

// -------------------- Телеметрия (WebSocket-like) --------------------

export type TelemetryUnsubscribe = () => void
export type DroneTelemetryCallback = (drone: Drone) => void

// храним интервалы телеметрии по id дрона
const telemetryTimers = new Map<string, number>()

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
    // если дрона нет — сразу ничего не делаем
    return () => {}
  }

  // сразу отдаём текущее состояние
  callback({ ...drone })

  // если уже есть таймер для этого дрона — чистим
  const existing = telemetryTimers.get(droneId)
  if (existing) {
    clearInterval(existing)
  }

  const timerId = window.setInterval(() => {
    const d = DRONES.find((x) => x.id === droneId)
    if (!d) return

    // лёгкая симуляция изменения батареи и статуса
if (d.status === 'on_mission' || d.status === 'returning') {
  const delta = Math.floor(Math.random() * 3) + 1 // 1–3%
  d.battery = Math.max(0, d.battery - delta)
  d.lastContact = 'несколько секунд назад'

  if (d.battery <= 10) {
    d.status = 'error'
    d.mission = 'Критический уровень заряда (симуляция)'
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
      clearInterval(t)
      telemetryTimers.delete(droneId)
    }
  }
}
