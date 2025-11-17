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

// Небольшая утилита задержки, как в других API
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Мок-данные по полётам
const FLIGHTS: Flight[] = [
  {
    id: 'fl-1001',
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
    id: 'fl-1002',
    droneId: 'dr-102',
    droneName: 'Дрон DR-102',
    stationId: 'st-1',
    stationName: 'Станция №1 — Северная',
    startTime: '2025-11-16 20:40',
    // ещё в полёте
    status: 'in_progress',
    distanceKm: 5.1,
    from: { lat: 55.03, lng: 82.92 },
    to: { lat: 55.02, lng: 82.97 },
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
    id: 'fl-3001',
    droneId: 'dr-301',
    droneName: 'Дрон DR-301',
    stationId: 'st-3',
    stationName: 'Станция №3 — Южная',
    startTime: '2025-11-16 19:00',
    // ошибка телеметрии — полёт завис в таком статусе
    status: 'in_progress',
    distanceKm: 2.7,
    from: { lat: 54.9, lng: 82.95 },
    to: { lat: 54.91, lng: 82.99 },
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

// -------------------- API-функции --------------------

export async function fetchFlights(): Promise<Flight[]> {
  await delay(300)
  // Можно имитировать сортировку «свежее выше»
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
