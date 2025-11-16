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
  lat: number         // широта
  lng: number         // долгота
}

// Фейковые станции для разработки
const STATIONS: Station[] = [
  {
    id: 'st-1',
    name: 'Станция №1 — Северная',
    location: '55.030, 82.920 (Новосибирск)',
    status: 'online',
    dronesTotal: 3,
    dronesActive: 1,
    batteryLevel: 82,
    lat: 55.120,
    lng: 82.920,
  },
  {
    id: 'st-2',
    name: 'Станция №2 — Восточная',
    location: '54.980, 83.050',
    status: 'offline',
    dronesTotal: 2,
    dronesActive: 0,
    batteryLevel: 56,
    lat: 55.030,
    lng: 83.100,
  },
  {
    id: 'st-3',
    name: 'Станция №3 — Южная',
    location: '54.900, 82.950',
    status: 'error',
    dronesTotal: 4,
    dronesActive: 2,
    batteryLevel: 34,
    lat: 54.900,
    lng: 82.950,
  },
]

// Имитация REST-запросов

export async function fetchStations(): Promise<Station[]> {
  // имитация задержки сети
  await new Promise((res) => setTimeout(res, 300))
  return STATIONS
}

export async function fetchStationById(id: string): Promise<Station | null> {
  await new Promise((res) => setTimeout(res, 200))
  const station = STATIONS.find((s) => s.id === id)
  return station ?? null
}

// Заглушки под "команды" станции (отправить дрон / вернуть / перезапуск)
export async function sendStationCommand(
  stationId: string,
  command: 'send_drone' | 'return_drone' | 'restart',
): Promise<void> {
  console.log('Команда к станции', stationId, command)
  await new Promise((res) => setTimeout(res, 300))
  // Тут позже можно будет обновлять STATIONS или дергать real API
}