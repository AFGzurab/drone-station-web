// src/shared/api/telemetry.ts
//
// Фейковая "реальная" телеметрия для дронов.
// Используется во всём приложении через подписку.

import { DRONES, type DroneStatus } from './drones'
import { logSystemEvent } from './events'
import { completeFlightForDrone } from './flights'

export type DroneTelemetry = {
  droneId: string
  lat: number
  lng: number
  altitude: number // м
  speed: number // км/ч
  battery: number // %
  signal: number // 0–100 (% качества связи)
  lastUpdate: number // timestamp (ms)
}

// простая карта "станция -> базовые координаты" для старта телеметрии
const STATION_BASE_COORDS: Record<string, { lat: number; lng: number }> = {
  'st-1': { lat: 55.03, lng: 82.92 },
  'st-2': { lat: 54.98, lng: 83.05 },
  'st-3': { lat: 54.9, lng: 82.95 },
}

// условные точки заданий для отдельных дронов
const DRONE_MISSION_TARGETS: Record<string, { lat: number; lng: number }> = {
  // DR-102 — поле южнее станции
  'dr-102': { lat: 54.98, lng: 82.93 },
  // DR-103 — участок восточнее станции
  'dr-103': { lat: 55.05, lng: 82.99 },
  // сюда можно добавлять другие дроны по мере необходимости
}

// ----- внутреннее состояние -----

const telemetryByDrone: Record<string, DroneTelemetry> = {}

type TelemetryListener = (telemetry: DroneTelemetry[]) => void

const listeners = new Set<TelemetryListener>()
let timer: number | null = null

// ----- вспомогательные функции -----

function initTelemetryForDrone(droneId: string): DroneTelemetry {
  const drone = DRONES.find((d) => d.id === droneId)

  const stationBase =
    (drone && STATION_BASE_COORDS[drone.stationId]) ||
    STATION_BASE_COORDS['st-1']

  // если дрон на задании — стартуем около точки задания,
  // иначе около станции
  const missionTarget =
    (drone && DRONE_MISSION_TARGETS[drone.id]) || stationBase

  const base = drone?.status === 'on_mission' ? missionTarget : stationBase

  // небольшое случайное смещение вокруг базовой точки
  const offsetLat = (Math.random() - 0.5) * 0.01
  const offsetLng = (Math.random() - 0.5) * 0.01

  const battery = drone?.battery ?? 100

  return {
    droneId,
    lat: base.lat + offsetLat,
    lng: base.lng + offsetLng,
    altitude: 80 + Math.random() * 20, // 80–100 м
    speed: 30 + Math.random() * 20, // 30–50 км/ч
    battery,
    signal: 70 + Math.random() * 30, // 70–100%
    lastUpdate: Date.now(),
  }
}

function updateTelemetryTick() {
  const now = Date.now()

  // пробегаемся по всем дронам и обновляем их телеметрию
  for (const drone of DRONES) {
    let t = telemetryByDrone[drone.id]
    if (!t) {
      t = initTelemetryForDrone(drone.id)
    }

    // базовые точки
    const stationBase =
      STATION_BASE_COORDS[drone.stationId] ?? STATION_BASE_COORDS['st-1']
    const missionTarget = DRONE_MISSION_TARGETS[drone.id] ?? stationBase

    // лёгкое "дрейфование" координат только для активных состояний
    let moveFactor = 0
    if (drone.status === 'on_mission' || drone.status === 'returning') {
      moveFactor = 0.002
    }

    t.lat += (Math.random() - 0.5) * moveFactor
    t.lng += (Math.random() - 0.5) * moveFactor

    // притяжение к точке задания
    if (drone.status === 'on_mission') {
      t.lat += (missionTarget.lat - t.lat) * 0.02
      t.lng += (missionTarget.lng - t.lng) * 0.02
    }

    // притяжение к станции, если возвращается
    if (drone.status === 'returning') {
      t.lat += (stationBase.lat - t.lat) * 0.03
      t.lng += (stationBase.lng - t.lng) * 0.03
    }

    // скорость в зависимости от статуса
    t.speed = getSpeedForStatus(drone.status)

    // высота чуть гуляет
    t.altitude += (Math.random() - 0.5) * 2
    t.altitude = Math.max(0, Math.min(120, t.altitude))

    // батарейка у активных дронов медленно падает
    let batteryDelta = 0
    if (drone.status === 'on_mission') batteryDelta = 1 + Math.random() * 1
    if (drone.status === 'returning') batteryDelta = 0.5 + Math.random() * 0.5

    const newBattery = Math.max(0, (drone.battery ?? t.battery) - batteryDelta)

    // синхронизируем батарею с основным мок-массивом DRONES
    drone.battery = Math.round(newBattery)
    t.battery = drone.battery

    // сигнал (немного шумим)
    t.signal = Math.max(
      0,
      Math.min(100, t.signal + (Math.random() - 0.5) * 5),
    )

    // --- Посадка при возврате на станцию ---
    if (drone.status === 'returning') {
      const dLat = t.lat - stationBase.lat
      const dLng = t.lng - stationBase.lng
      const dist = Math.sqrt(dLat * dLat + dLng * dLng)

      // порог ≈ 150–200 м в градусах (~0.002)
      if (dist < 0.002) {
        // "дрон сел" — фиксируем на станции
        t.lat = stationBase.lat
        t.lng = stationBase.lng
        t.altitude = 0
        t.speed = 0

        // меняем состояние мок-дрона:
        drone.status = 'idle'
        drone.mission = 'Ожидание задания'

        // 🔹 помечаем последний активный полёт как завершённый
        completeFlightForDrone(drone.id)

        // 🔹 логируем системное событие о возврате
        logSystemEvent({
  level: 'info',
  source: 'monitoring',
  title: `Дрон ${drone.code} завершил полёт и вернулся на станцию ${drone.stationId}`,
})
      }
    }

    t.lastUpdate = now
    telemetryByDrone[drone.id] = t
  }

  // уведомляем всех слушателей
  const snapshot = Object.values(telemetryByDrone)
  listeners.forEach((cb) => cb(snapshot))
}

function getSpeedForStatus(status: DroneStatus): number {
  switch (status) {
    case 'on_mission':
      return 40 + Math.random() * 10 // 40–50
    case 'returning':
      return 30 + Math.random() * 10 // 30–40
    case 'error':
      return 0
    case 'offline':
      return 0
    case 'idle':
    default:
      return 0
  }
}

function ensureTimerStarted() {
  if (timer != null) return
  // обновляем телеметрию каждые 3 секунды
  timer = window.setInterval(updateTelemetryTick, 3000)
  // первый тик сразу, чтобы не ждать 3 секунды
  updateTelemetryTick()
}

function maybeStopTimer() {
  if (listeners.size === 0 && timer != null) {
    window.clearInterval(timer)
    timer = null
  }
}

// ----- публичный API -----

export function subscribeToTelemetry(
  listener: TelemetryListener,
): () => void {
  listeners.add(listener)
  ensureTimerStarted()

  // отдаём текущий снимок сразу
  listener(Object.values(telemetryByDrone))

  return () => {
    listeners.delete(listener)
    maybeStopTimer()
  }
}

export function getTelemetrySnapshot(): DroneTelemetry[] {
  return Object.values(telemetryByDrone)
}

export function getTelemetryForDrone(
  droneId: string,
): DroneTelemetry | null {
  return telemetryByDrone[droneId] ?? null
}

// для карты: получить точку назначения дрона (если есть)
export function getMissionTarget(
  droneId: string,
): { lat: number; lng: number } | null {
  return DRONE_MISSION_TARGETS[droneId] ?? null
}
