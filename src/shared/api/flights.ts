// src/shared/api/flights.ts

// Статус полёта
export type FlightStatus = 'planned' | 'in_progress' | 'completed' | 'aborted'

export type Flight = {
  id: string
  droneId: string
  droneName: string
  stationId: string
  stationName: string

  // Время в удобной строке, без Date для простоты
  startTime: string
  endTime?: string

  status: FlightStatus
  distanceKm: number

  // Маршрут на карте
  from: { lat: number; lng: number }
  to: { lat: number; lng: number }
}

// -------------------------------------------------------
// Внутреннее "хранилище" полётов
// -------------------------------------------------------

const MAX_FLIGHTS = 200

// Стартовые мок-данные (как в макете истории полётов)
let FLIGHTS: Flight[] = [
  {
    id: 'fl-1001',
    droneId: 'dr-103',
    droneName: 'Дрон DR-103',
    stationId: 'st-1',
    stationName: 'Станция №1 — Северная',
    startTime: '2025-11-16 20:55',
    endTime: '2025-11-16 21:05',
    status: 'completed',
    distanceKm: 3.2,
    from: { lat: 55.03, lng: 82.92 },
    to: { lat: 55.035, lng: 82.95 },
  },
  {
    id: 'fl-1002',
    droneId: 'dr-101',
    droneName: 'Дрон DR-101',
    stationId: 'st-1',
    stationName: 'Станция №1 — Северная',
    startTime: '2025-11-16 20:55',
    endTime: '2025-11-16 21:05',
    status: 'completed',
    distanceKm: 3.2,
    from: { lat: 55.03, lng: 82.92 },
    to: { lat: 55.035, lng: 82.95 },
  },
  {
    id: 'fl-1003',
    droneId: 'dr-102',
    droneName: 'Дрон DR-102',
    stationId: 'st-1',
    stationName: 'Станция №1 — Северная',
    startTime: '2025-11-16 20:40',
    status: 'in_progress',
    distanceKm: 5.1,
    from: { lat: 55.03, lng: 82.92 },
    to: { lat: 55.02, lng: 82.97 },
  },
  {
    id: 'fl-3001',
    droneId: 'dr-301',
    droneName: 'Дрон DR-301',
    stationId: 'st-3',
    stationName: 'Станция №3 — Южная',
    startTime: '2025-11-16 19:00',
    status: 'in_progress',
    distanceKm: 2.7,
    from: { lat: 54.9, lng: 82.95 },
    to: { lat: 54.91, lng: 82.99 },
  },
  {
    id: 'fl-2001',
    droneId: 'dr-201',
    droneName: 'Дрон DR-201',
    stationId: 'st-2',
    stationName: 'Станция №2 — Восточная',
    startTime: '2025-11-16 18:10',
    endTime: '2025-11-16 18:32',
    status: 'aborted',
    distanceKm: 4.4,
    from: { lat: 54.98, lng: 83.05 },
    to: { lat: 54.99, lng: 83.09 },
  },
  {
    id: 'fl-2002',
    droneId: 'dr-201',
    droneName: 'Дрон DR-201',
    stationId: 'st-2',
    stationName: 'Станция №2 — Восточная',
    startTime: '2025-11-16 17:20',
    endTime: '2025-11-16 17:45',
    status: 'completed',
    distanceKm: 6.0,
    from: { lat: 54.98, lng: 83.05 },
    to: { lat: 54.96, lng: 83.02 },
  },
  {
    id: 'fl-3002',
    droneId: 'dr-301',
    droneName: 'Дрон DR-301',
    stationId: 'st-3',
    stationName: 'Станция №3 — Южная',
    startTime: '2025-11-16 16:30',
    endTime: '2025-11-16 16:55',
    status: 'completed',
    distanceKm: 3.8,
    from: { lat: 54.9, lng: 82.95 },
    to: { lat: 54.92, lng: 82.92 },
  },
]

// -------------------------------------------------------
// Вспомогалки
// -------------------------------------------------------

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Человекочитаемая строка времени в формате YYYY-MM-DD HH:MM
function formatNow(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// Координаты станций — чтобы для новых полётов ставить from/to
const STATION_COORDS: Record<string, { lat: number; lng: number }> = {
  'st-1': { lat: 55.03, lng: 82.92 },
  'st-2': { lat: 54.98, lng: 83.05 },
  'st-3': { lat: 54.9, lng: 82.95 },
}

// Лёгкая генерация точки назначения рядом со станцией
function randomTargetNear(stationId: string): { lat: number; lng: number } {
  const base = STATION_COORDS[stationId] ?? { lat: 55, lng: 83 }
  const dLat = (Math.random() - 0.5) * 0.05
  const dLng = (Math.random() - 0.5) * 0.05
  return { lat: base.lat + dLat, lng: base.lng + dLng }
}

// Добавляем полёт в стор, ограничивая длину массива
function addFlight(flight: Flight) {
  FLIGHTS = [flight, ...FLIGHTS]
  if (FLIGHTS.length > MAX_FLIGHTS) {
    FLIGHTS = FLIGHTS.slice(0, MAX_FLIGHTS)
  }
}

// Находим последний активный полёт дрона
function findLastActiveFlight(droneId: string): Flight | undefined {
  return FLIGHTS.find(
    (f) => f.droneId === droneId && f.status === 'in_progress',
  )
}

// -------------------------------------------------------
// Публичный API (как было + новые функции)
// -------------------------------------------------------

export async function fetchFlights(): Promise<Flight[]> {
  await delay(300)
  return [...FLIGHTS].sort((a, b) => (a.startTime < b.startTime ? 1 : -1))
}

export async function fetchFlightById(id: string): Promise<Flight | null> {
  await delay(250)
  const flight = FLIGHTS.find((f) => f.id === id)
  return flight ?? null
}

export async function fetchFlightsByDrone(
  droneId: string,
): Promise<Flight[]> {
  await delay(250)
  return FLIGHTS.filter((f) => f.droneId === droneId).sort((a, b) =>
    a.startTime < b.startTime ? 1 : -1,
  )
}

export async function fetchActiveFlights(): Promise<Flight[]> {
  await delay(200)
  return FLIGHTS.filter((f) => f.status === 'in_progress')
}

// -------- функции, которые зовут drones/telemetry --------

export type StartFlightParams = {
  droneId: string
  droneName: string
  stationId: string
  stationName: string
  plannedDistanceKm?: number
}

/** Создаёт новую запись о полёте (дрон отправлен на задание) */
export function startFlightForDrone(params: StartFlightParams): Flight {
  const id = `fl-${Date.now().toString(36)}-${Math.random()
    .toString(16)
    .slice(2, 6)}`
  const startTime = formatNow()
  const distanceKm =
    typeof params.plannedDistanceKm === 'number'
      ? params.plannedDistanceKm
      : 4 + Math.random() * 3 // 4–7 км

  const from = STATION_COORDS[params.stationId] ?? { lat: 55, lng: 83 }
  const to = randomTargetNear(params.stationId)

  const flight: Flight = {
    id,
    droneId: params.droneId,
    droneName: params.droneName,
    stationId: params.stationId,
    stationName: params.stationName,
    startTime,
    status: 'in_progress',
    distanceKm,
    from,
    to,
  }

  addFlight(flight)
  return flight
}

/** Помечает последний активный полёт дрона как завершённый */
export function completeFlightForDrone(droneId: string): void {
  const f = findLastActiveFlight(droneId)
  if (!f) return

  f.status = 'completed'
  f.endTime = formatNow()
}

/** Помечает последний активный полёт дрона как прерванный */
export function abortFlightForDrone(
  droneId: string,
  _reason?: string,
): void {
  const f = findLastActiveFlight(droneId)
  if (!f) return

  f.status = 'aborted'
  f.endTime = formatNow()
}
