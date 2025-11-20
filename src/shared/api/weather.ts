// src/shared/api/weather.ts
//
// Реальные погодные данные через Open-Meteo (без API-ключей)
// и совместимый интерфейс под AdminPage / StationDetails / DronePage.

import { logSystemEvent } from './events'

export type WeatherRiskLevel = 'ok' | 'warning' | 'no_fly'

export type WeatherInfo = {
  tempC: number
  windSpeedMs: number
  windGustMs: number | null
  visibilityKm: number | null
  description: string
  riskLevel: WeatherRiskLevel
  updatedAt: number // timestamp (ms)
}

// Координаты «кластера станций» по умолчанию (Новосибирск)
const DEFAULT_CLUSTER_COORDS = {
  lat: 55.03,
  lng: 82.92,
}

// -------------------------------------------------
// Флаг симуляции «нелётной погоды»
// -------------------------------------------------

let forcedRiskLevel: WeatherRiskLevel | null = null

/**
 * Включает / выключает режим симуляции погоды.
 * mode = 'no_fly' | 'warning' | 'ok' | null
 * null = использовать реальную оценку.
 */
export function setWeatherSimulationMode(mode: WeatherRiskLevel | null) {
  forcedRiskLevel = mode

  if (mode === 'no_fly') {
    logSystemEvent({
      level: 'warning',
      source: 'admin',
      title: 'Администратор включил симуляцию нелётной погоды.',
    })
  } else if (mode === null) {
    logSystemEvent({
      level: 'info',
      source: 'admin',
      title: 'Администратор отключил симуляцию погоды (используем реальные данные).',
    })
  } else {
    logSystemEvent({
      level: 'info',
      source: 'admin',
      title: `Администратор задал симулируемый уровень погодного риска: ${mode}.`,
    })
  }
}

/** Текущий режим симуляции (для отладки / отображения в UI) */
export function getWeatherSimulationMode(): WeatherRiskLevel | null {
  return forcedRiskLevel
}

// -------------------------------------------------
// Вспомогательные функции
// -------------------------------------------------

// Короткое описание по коду погоды Open-Meteo
function describeWeatherCode(code: number | undefined): string {
  if (code == null) return 'Нет данных'

  if (code === 0) return 'Ясно'
  if ([1, 2, 3].includes(code)) return 'Облачно'
  if ([45, 48].includes(code)) return 'Туман / дымка'
  if ([51, 53, 55].includes(code)) return 'Морось'
  if ([56, 57].includes(code)) return 'Ледяная морось'
  if ([61, 63, 65].includes(code)) return 'Дождь'
  if ([66, 67].includes(code)) return 'Ледяной дождь'
  if ([71, 73, 75, 77].includes(code)) return 'Снег'
  if ([80, 81, 82].includes(code)) return 'Ливни'
  if ([85, 86].includes(code)) return 'Снегопад'
  if ([95, 96, 99].includes(code)) return 'Гроза'

  return 'Сложные условия'
}

// Оценка «лётности» по параметрам
function evaluateRisk(params: {
  windMs: number
  windGustMs: number | null
  visibilityKm: number | null
  precipitationMm: number | null
}): { riskLevel: WeatherRiskLevel } {
  const { windMs, windGustMs, visibilityKm, precipitationMm } = params

  // жёсткие условия = no_fly
  const isNoFly =
    windMs > 15 ||
    (windGustMs ?? 0) > 20 ||
    (visibilityKm !== null && visibilityKm < 1) ||
    (precipitationMm !== null && precipitationMm > 1)

  if (isNoFly) {
    return { riskLevel: 'no_fly' }
  }

  // просто «осложнены»
  const hasWarning =
    windMs > 10 ||
    (windGustMs ?? 0) > 15 ||
    (visibilityKm !== null && visibilityKm < 2) ||
    (precipitationMm !== null && precipitationMm > 0.2)

  if (hasWarning) {
    return { riskLevel: 'warning' }
  }

  return { riskLevel: 'ok' }
}

// -------------------------------------------------
// Трекинг изменений погоды для системных событий
// -------------------------------------------------

let lastRiskLevel: WeatherRiskLevel | null = null

function maybeLogWeatherEvent(
  newLevel: WeatherRiskLevel,
  description: string,
) {
  // если ничего не поменялось — молчим
  if (newLevel === lastRiskLevel) return

  // переход в осложнённые условия
  if (newLevel === 'warning') {
    logSystemEvent({
      level: 'warning',
      source: 'system',
      title: `Погодные условия осложнены: ${description}`,
    })
  }

  // переход в нелётную погоду
  if (newLevel === 'no_fly') {
    logSystemEvent({
      level: 'warning',
      source: 'system',
      title: `Нелётная погода в районе кластера станций: ${description}`,
    })
  }

  // если было плохо и стало ок — зафиксируем нормализацию
  if (
    newLevel === 'ok' &&
    (lastRiskLevel === 'warning' || lastRiskLevel === 'no_fly')
  ) {
    logSystemEvent({
      level: 'info',
      source: 'system',
      title: 'Погодные условия нормализовались (лётная погода).',
    })
  }

  lastRiskLevel = newLevel
}

// -------------------------------------------------
// Основная функция, которую ждут страницы
// -------------------------------------------------

export async function fetchWeather(
  lat: number = DEFAULT_CLUSTER_COORDS.lat,
  lng: number = DEFAULT_CLUSTER_COORDS.lng,
): Promise<WeatherInfo> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')

  url.searchParams.set('latitude', lat.toString())
  url.searchParams.set('longitude', lng.toString())

  // Какие текущие параметры нам нужны
  url.searchParams.set(
    'current',
    [
      'temperature_2m',
      'wind_speed_10m',
      'wind_gusts_10m',
      'visibility',
      'precipitation',
      'weather_code',
    ].join(','),
  )

  url.searchParams.set('wind_speed_unit', 'ms')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString())

  if (!res.ok) {
    throw new Error(`Weather HTTP error: ${res.status}`)
  }

  const data = await res.json()

  const current = data.current as {
    time: string
    temperature_2m: number
    wind_speed_10m: number
    wind_gusts_10m?: number
    visibility?: number // м
    precipitation?: number // мм
    weather_code?: number
  }

  const tempC = current.temperature_2m
  const windSpeedMs = current.wind_speed_10m
  const windGustMs = current.wind_gusts_10m ?? null

  const visibilityKm =
    typeof current.visibility === 'number'
      ? Math.round((current.visibility / 1000) * 10) / 10
      : null

  const precipitationMm =
    typeof current.precipitation === 'number'
      ? Math.round(current.precipitation * 10) / 10
      : null

  const description = describeWeatherCode(current.weather_code)

  const { riskLevel } = evaluateRisk({
    windMs: windSpeedMs,
    windGustMs,
    visibilityKm,
    precipitationMm,
  })

  // применяем симуляцию, если включена
  const finalRiskLevel: WeatherRiskLevel =
    forcedRiskLevel !== null ? forcedRiskLevel : riskLevel

  const updatedAt = new Date(current.time).getTime()

  // логируем событие по ИТОГОВОМУ уровню риска
  maybeLogWeatherEvent(finalRiskLevel, description)

  return {
    tempC,
    windSpeedMs,
    windGustMs,
    visibilityKm,
    description,
    riskLevel: finalRiskLevel,
    updatedAt,
  }
}
