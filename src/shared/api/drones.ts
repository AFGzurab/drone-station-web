// src/shared/api/drones.ts

export type DroneStatus = 'idle' | 'on_mission' | 'returning' | 'error'

export type Drone = {
  id: string
  name: string
  code: string
  stationId: string
  status: DroneStatus
  battery: number // %
  lastContact: string
  mission: string
}

const DRONES: Drone[] = [
  {
    id: 'dr-101',
    name: 'Дрон DR-101',
    code: 'DR-101',
    stationId: 'st-1',
    status: 'idle',
    battery: 86,
    lastContact: '1 минута назад',
    mission: 'Ожидание задания',
  },
  {
    id: 'dr-102',
    name: 'Дрон DR-102',
    code: 'DR-102',
    stationId: 'st-1',
    status: 'on_mission',
    battery: 63,
    lastContact: '30 секунд назад',
    mission: 'Мониторинг поля №12',
  },
  {
    id: 'dr-201',
    name: 'Дрон DR-201',
    code: 'DR-201',
    stationId: 'st-2',
    status: 'returning',
    battery: 42,
    lastContact: '2 минуты назад',
    mission: 'Возврат на станцию',
  },
  {
    id: 'dr-301',
    name: 'Дрон DR-301',
    code: 'DR-301',
    stationId: 'st-3',
    status: 'error',
    battery: 12,
    lastContact: '7 минут назад',
    mission: 'Ошибка связи, требуется проверка',
  },
]

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchDroneById(id: string): Promise<Drone | null> {
  await delay(300)
  const drone = DRONES.find((d) => d.id === id)
  return drone ?? null
}

export async function fetchDronesByStation(
  stationId: string,
): Promise<Drone[]> {
  await delay(300)
  return DRONES.filter((d) => d.stationId === stationId)
}

// Заглушка для отправки "команд" дрону
export type DroneCommand = 'send_on_mission' | 'return_to_station' | 'force_land'

export async function sendDroneCommand(
  id: string,
  command: DroneCommand,
): Promise<{ success: boolean; message: string }> {
  await delay(500)

  switch (command) {
    case 'send_on_mission':
      return { success: true, message: 'Дрон отправлен на задание (фейк).' }
    case 'return_to_station':
      return { success: true, message: 'Команда возврата на станцию выполнена (фейк).' }
    case 'force_land':
      return { success: true, message: 'Выполнена экстренная посадка (фейк).' }
    default:
      return { success: false, message: 'Неизвестная команда.' }
  }
}