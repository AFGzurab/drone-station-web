// src/shared/api/stations.ts

export type StationStatus = 'online' | 'offline' | 'error'

export type Station = {
  id: string
  name: string
  location: string
  status: StationStatus
  dronesTotal: number
  dronesActive: number
  batteryLevel: number // средний заряд, %
  lat: number
  lng: number
}

const STATIONS: Station[] = [
  {
    id: 'st-1',
    name: 'Станция №1 — Северная',
    location: '55.030, 82.920 (Новосибирск)',
    status: 'online',
    dronesTotal: 3,
    dronesActive: 1,
    batteryLevel: 82,
    lat: 55.12,
    lng: 82.92,
  },
  {
    id: 'st-2',
    name: 'Станция №2 — Восточная',
    location: '54.980, 83.050',
    status: 'offline',
    dronesTotal: 2,
    dronesActive: 0,
    batteryLevel: 56,
    lat: 55.03,
    lng: 83.1,
  },
  {
    id: 'st-3',
    name: 'Станция №3 — Южная',
    location: '54.900, 82.950',
    status: 'error',
    dronesTotal: 4,
    dronesActive: 2,
    batteryLevel: 34,
    lat: 54.9,
    lng: 82.95,
  },
]

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchStations(): Promise<Station[]> {
  await delay(300)
  return STATIONS
}

export async function fetchStationById(id: string): Promise<Station | null> {
  await delay(300)
  const station = STATIONS.find((s) => s.id === id)
  return station ?? null
}

// ---- НОВОЕ: тип команды и ответ ----

export type StationCommand = 'send_drone' | 'return_drone' | 'restart_station'

export async function sendStationCommand(
  id: string,
  command: StationCommand,
): Promise<{ success: boolean; message: string }> {
  await delay(500)

  // Тут мог бы быть реальный запрос на backend. Пока — фейковая логика.
  switch (command) {
    case 'send_drone':
      return {
        success: true,
        message: 'Команда отправки дрона на задание выполнена (фейк).',
      }
    case 'return_drone':
      return {
        success: true,
        message: 'Команда возврата дрона на станцию выполнена (фейк).',
      }
    case 'restart_station':
      return {
        success: true,
        message: 'Станция перезапущена (фейк).',
      }
    default:
      return {
        success: false,
        message: 'Неизвестная команда станции.',
      }
  }
}