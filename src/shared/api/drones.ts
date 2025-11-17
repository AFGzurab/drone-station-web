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

// Отправка команды дрону (фейк)
export async function sendDroneCommand(
  id: string,
  command: DroneCommand,
): Promise<{ success: boolean; message: string }> {
  await delay(500)

  switch (command) {
    case 'send_on_mission':
      return {
        success: true,
        message: `Дрон ${id}: отправлен на задание (фейк).`,
      }
    case 'return_to_station':
      return {
        success: true,
        message: `Дрон ${id}: возвращается на станцию (фейк).`,
      }
    case 'emergency_landing':
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
