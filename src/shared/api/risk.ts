// src/shared/api/risk.ts
//
// Простая "предиктивная" система оценки риска полёта дрона.
// Это rule-based движок, который анализирует:
//  - погоду
//  - заряд батареи
//  - качество сигнала
//  - статус дрона
// и возвращает интегральный риск + факторы.
//
// Позже мы сможем:
//  - показывать риск в интерфейсе станции/карты
//  - логировать изменения риска в системные события

import type { Drone } from './drones'
import type { DroneTelemetry } from './telemetry'
import type { WeatherInfo, WeatherRiskLevel } from './weather'
import { logSystemEvent, type SystemEventLevel } from './events'

// Уровень интегрального риска для дрона
export type RiskLevel = 'low' | 'medium' | 'high'

// Конкретные факторы риска (можно расширять)
export type RiskFactorId =
  | 'battery_low'
  | 'battery_critical'
  | 'signal_unstable'
  | 'signal_critical'
  | 'weather_warning'
  | 'weather_no_fly'
  | 'status_error'
  | 'status_returning_with_low_battery'
  | 'high_altitude'

export type RiskFactor = {
  id: RiskFactorId
  label: string        // короткое имя фактора
  level: RiskLevel     // локальная «сила» фактора
  weight: number       // вклад в общий балл (0–100)
  description: string  // что именно пошло не так
}

export type DroneRiskSummary = {
  droneId: string
  droneCode: string
  stationId: string

  level: RiskLevel   // итоговый риск
  score: number      // 0–100 (чем выше, тем хуже)

  weatherRisk: WeatherRiskLevel | null
  factors: RiskFactor[]
}

// -----------------------------
// Внутренние настройки модели
// -----------------------------

// Пороговые значения для перевода score -> level
const SCORE_MEDIUM = 30
const SCORE_HIGH = 70

// Последний известный уровень риска по дрону —
// чтобы не спамить событиями
const lastRiskLevelByDrone: Record<string, RiskLevel> = {}

// -----------------------------
// Оценка риска для одного дрона
// -----------------------------

export function evaluateDroneRisk(input: {
  drone: Drone
  telemetry: DroneTelemetry | null
  weather: WeatherInfo | null
}): DroneRiskSummary {
  const { drone, telemetry, weather } = input

  const factors: RiskFactor[] = []
  let score = 0

  const battery = telemetry?.battery ?? drone.battery ?? 100
  const signal = telemetry?.signal ?? 100
  const altitude = telemetry?.altitude ?? 0
  const weatherRisk = weather?.riskLevel ?? null

  function addFactor(f: RiskFactor) {
    factors.push(f)
    score += f.weight
  }

  // --- Батарея ---

  if (battery <= 15) {
    addFactor({
      id: 'battery_critical',
      label: 'Критически низкий заряд',
      level: 'high',
      weight: 40,
      description: `Заряд батареи дрона ${drone.code} опустился до ${battery}%.`,
    })
  } else if (battery <= 30) {
    addFactor({
      id: 'battery_low',
      label: 'Низкий заряд',
      level: 'medium',
      weight: 25,
      description: `Заряд батареи дрона ${drone.code} ниже порога безопасности (${battery}%).`,
    })
  }

  // --- Сигнал связи ---

  if (signal <= 30) {
    addFactor({
      id: 'signal_critical',
      label: 'Критический сигнал',
      level: 'high',
      weight: 35,
      description: `Качество сигнала с дроном ${drone.code} критически низкое (${signal}%).`,
    })
  } else if (signal <= 60) {
    addFactor({
      id: 'signal_unstable',
      label: 'Нестабильная связь',
      level: 'medium',
      weight: 20,
      description: `Качество сигнала с дроном ${drone.code} нестабильно (${signal}%).`,
    })
  }

  // --- Погода ---

  if (weatherRisk === 'no_fly') {
    addFactor({
      id: 'weather_no_fly',
      label: 'Нелётная погода',
      level: 'high',
      weight: 45,
      description:
        'Погодный модуль оценивает условия как "нелётная погода" для данного кластера станций.',
    })
  } else if (weatherRisk === 'warning') {
    addFactor({
      id: 'weather_warning',
      label: 'Осложнённые условия',
      level: 'medium',
      weight: 25,
      description:
        'Погодный модуль сообщает об осложнённых условиях (усиленный ветер / осадки / низкая видимость).',
    })
  }

  // --- Статус дрона ---

  if (drone.status === 'error') {
    addFactor({
      id: 'status_error',
      label: 'Состояние: ошибка',
      level: 'high',
      weight: 50,
      description: `Дрон ${drone.code} находится в статусе "Ошибка".`,
    })
  }

  if (drone.status === 'returning' && battery <= 25) {
    addFactor({
      id: 'status_returning_with_low_battery',
      label: 'Возврат с низким зарядом',
      level: 'medium',
      weight: 20,
      description: `Дрон ${drone.code} возвращается на станцию с низким уровнем заряда (${battery}%).`,
    })
  }

  // --- Высота ---

  if (altitude > 120) {
    addFactor({
      id: 'high_altitude',
      label: 'Повышенная высота',
      level: 'medium',
      weight: 10,
      description: `Текущая высота дрона ${drone.code} превышает типовой коридор (${Math.round(
        altitude,
      )} м).`,
    })
  }

  // Нормируем score до 0–100
  score = Math.max(0, Math.min(100, score))

  // Переводим score в уровень риска
  let level: RiskLevel
  if (score >= SCORE_HIGH) level = 'high'
  else if (score >= SCORE_MEDIUM) level = 'medium'
  else level = 'low'

  // Усиливаем уровень, если погода совсем плохая
  if (weatherRisk === 'no_fly') {
    level = 'high'
  } else if (weatherRisk === 'warning' && level === 'low') {
    level = 'medium'
  }

  return {
    droneId: drone.id,
    droneCode: drone.code,
    stationId: drone.stationId,
    level,
    score,
    weatherRisk,
    factors,
  }
}

// ------------------------------------------------------
// Логирование изменений риска в системные события
// ------------------------------------------------------

function riskLevelToEventLevel(level: RiskLevel): SystemEventLevel {
  switch (level) {
    case 'high':
      return 'error'
    case 'medium':
      return 'warning'
    default:
      return 'info'
  }
}

/**
 * Вызывается после evaluateDroneRisk().
 * Если уровень риска для дрона ухудшился (low -> medium/high, medium -> high),
 * добавляет запись в системные события.
 */
export function logRiskEventIfNeeded(summary: DroneRiskSummary): void {
  const prev = lastRiskLevelByDrone[summary.droneId]
  lastRiskLevelByDrone[summary.droneId] = summary.level

  // первый расчёт — ничего не логируем, чтобы не засорять журнал
  if (!prev) return

  const worsened =
    (prev === 'low' && (summary.level === 'medium' || summary.level === 'high')) ||
    (prev === 'medium' && summary.level === 'high')

  if (!worsened) return

  const criticalFactor =
    summary.factors.find((f) => f.level === 'high') ?? summary.factors[0]

  const title =
    summary.level === 'high'
      ? `Высокий прогнозируемый риск для дрона ${summary.droneCode}. ${
          criticalFactor ? criticalFactor.label : ''
        }`
      : `Рост прогнозируемого риска для дрона ${summary.droneCode} до среднего уровня.`

  logSystemEvent({
    title: title.trim(),
    level: riskLevelToEventLevel(summary.level),
    source: 'monitoring',
  })
}
