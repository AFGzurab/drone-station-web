// src/modules/stations/StationDetailsPage.tsx

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  fetchStationById,
  sendStationCommand,
  type Station,
} from '../../shared/api/stations'

import {
  fetchDronesByStation,
  sendDroneCommand,
  type Drone,
} from '../../shared/api/drones'

import {
  fetchWeather,
  type WeatherInfo,
  type WeatherRiskLevel,
} from '../../shared/api/weather'

import {
  subscribeToTelemetry,
  type DroneTelemetry,
} from '../../shared/api/telemetry'

import {
  evaluateDroneRisk,
  logRiskEventIfNeeded,
  type DroneRiskSummary,
  type RiskLevel,
} from '../../shared/api/risk'

// ----- helpers для погоды -----

function getWeatherRiskLabel(level: WeatherRiskLevel): string {
  switch (level) {
    case 'ok':
      return 'Условия нормальные'
    case 'warning':
      return 'Условия осложнены'
    case 'no_fly':
      return 'Нелётная погода'
    default:
      return level
  }
}

function getWeatherRiskBadgeClass(level: WeatherRiskLevel): string {
  switch (level) {
    case 'ok':
      return 'bg-emerald-500/15 text-emerald-300'
    case 'warning':
      return 'bg-amber-500/15 text-amber-300'
    case 'no_fly':
      return 'bg-rose-500/20 text-rose-300'
    default:
      return 'bg-slate-500/20 text-slate-200'
  }
}

// ----- helpers для риска дронов -----

function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'Низкий'
    case 'medium':
      return 'Средний'
    case 'high':
      return 'Высокий'
    default:
      return level
  }
}

function getRiskLevelBadgeClass(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'bg-emerald-500/15 text-emerald-300'
    case 'medium':
      return 'bg-amber-500/20 text-amber-300'
    case 'high':
      return 'bg-rose-500/20 text-rose-300'
    default:
      return 'bg-slate-500/20 text-slate-200'
  }
}

type TelemetryByDrone = Record<string, DroneTelemetry>

// --------------------------------------------------------

export default function StationDetailsPage() {
  const navigate = useNavigate()
  // Параметр маршрута: /stations/:id
  const { id = '' } = useParams<{ id: string }>()

  const [station, setStation] = useState<Station | null>(null)
  const [stationLoading, setStationLoading] = useState(true)
  const [stationError, setStationError] = useState<string | null>(null)

  const [drones, setDrones] = useState<Drone[]>([])
  const [dronesLoading, setDronesLoading] = useState(true)
  const [dronesError, setDronesError] = useState<string | null>(null)

  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  const [telemetryByDrone, setTelemetryByDrone] = useState<TelemetryByDrone>({})

  const [commandStatus, setCommandStatus] = useState<string | null>(null)
  const [commandLoading, setCommandLoading] = useState(false)

  // ----------------- загрузка станции -----------------

  useEffect(() => {
    if (!id) return

    let cancelled = false

    async function loadStation(stationId: string) {
      try {
        setStationLoading(true)
        setStationError(null)
        const data = await fetchStationById(stationId)
        if (!cancelled) {
          if (!data) {
            setStationError('Станция не найдена.')
          } else {
            setStation(data)
          }
        }
      } catch {
        if (!cancelled) {
          setStationError('Не удалось загрузить данные станции.')
        }
      } finally {
        if (!cancelled) {
          setStationLoading(false)
        }
      }
    }

    loadStation(id)

    return () => {
      cancelled = true
    }
  }, [id])

  // ----------------- загрузка дронов -----------------

  useEffect(() => {
    if (!id) return

    let cancelled = false

    async function loadDrones(stationId: string) {
      try {
        setDronesLoading(true)
        setDronesError(null)
        const ds = await fetchDronesByStation(stationId)
        if (!cancelled) {
          setDrones(ds)
        }
      } catch {
        if (!cancelled) {
          setDronesError('Не удалось загрузить список дронов.')
        }
      } finally {
        if (!cancelled) {
          setDronesLoading(false)
        }
      }
    }

    loadDrones(id)

    return () => {
      cancelled = true
    }
  }, [id])

  // ----------------- загрузка погоды -----------------

  useEffect(() => {
    let cancelled = false

    async function loadWeather() {
      try {
        setWeatherLoading(true)
        setWeatherError(null)
        const w = await fetchWeather()
        if (!cancelled) {
          setWeather(w)
        }
      } catch {
        if (!cancelled) {
          setWeatherError('Не удалось загрузить данные погоды.')
        }
      } finally {
        if (!cancelled) {
          setWeatherLoading(false)
        }
      }
    }

    loadWeather()
    const timerId = window.setInterval(loadWeather, 5 * 60 * 1000)

    return () => {
      cancelled = true
      window.clearInterval(timerId)
    }
  }, [])

  // ----------------- подписка на телеметрию -----------------

  useEffect(() => {
    const unsubscribe = subscribeToTelemetry((snapshot) => {
      setTelemetryByDrone(
        snapshot.reduce<TelemetryByDrone>((acc, t) => {
          acc[t.droneId] = t
          return acc
        }, {}),
      )
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // ----------------- расчёт производных -----------------

  const battery = station?.batteryAvg ?? station?.batteryLevel ?? 0

  const dronesIdle = useMemo(
    () => drones.filter((d) => d.status === 'idle'),
    [drones],
  )

  const dronesOnMission = useMemo(
    () => drones.filter((d) => d.status === 'on_mission'),
    [drones],
  )

  const dronesReturning = useMemo(
    () => drones.filter((d) => d.status === 'returning'),
    [drones],
  )

  const riskByDrone: Record<string, DroneRiskSummary> = useMemo(() => {
    if (!weather) return {}
    const result: Record<string, DroneRiskSummary> = {}
    for (const d of drones) {
      const telemetry = telemetryByDrone[d.id] ?? null
      const summary = evaluateDroneRisk({
        drone: d,
        telemetry,
        weather,
      })
      result[d.id] = summary
    }
    return result
  }, [drones, telemetryByDrone, weather])

  useEffect(() => {
    if (!weather) return
    for (const d of drones) {
      const telemetry = telemetryByDrone[d.id] ?? null
      const summary = evaluateDroneRisk({
        drone: d,
        telemetry,
        weather,
      })
      logRiskEventIfNeeded(summary)
    }
  }, [drones, telemetryByDrone, weather])

  const isNoFly = weather?.riskLevel === 'no_fly'

  // ----------------- обработчики команд -----------------

  async function handleRestartStation() {
    if (!station) return

    setCommandLoading(true)
    setCommandStatus(null)

    try {
      const result = await sendStationCommand(station.id, 'restart')
      setCommandStatus(result.message)
    } catch {
      setCommandStatus('Не удалось выполнить команду перезапуска станции.')
    } finally {
      setCommandLoading(false)
    }
  }

  async function handleSendDronesOnMission() {
    if (!station) return
    if (isNoFly) return

    const targets = dronesIdle
    if (targets.length === 0) {
      setCommandStatus('Нет дронов в состоянии ожидания.')
      return
    }

    setCommandLoading(true)
    setCommandStatus(null)

    try {
      for (const d of targets) {
        await sendDroneCommand(d.id, 'send_on_mission')
      }
      setCommandStatus(
        `Отправлено на задание дронов: ${targets.length} (симуляция).`,
      )
    } catch {
      setCommandStatus('Не удалось отправить дронов на задание.')
    } finally {
      setCommandLoading(false)
    }
  }

  async function handleReturnDronesToStation() {
    const targets = [...dronesOnMission, ...dronesReturning]
    if (targets.length === 0) {
      setCommandStatus('Нет дронов, которые можно вернуть на станцию.')
      return
    }

    setCommandLoading(true)
    setCommandStatus(null)

    try {
      for (const d of targets) {
        await sendDroneCommand(d.id, 'return_to_station')
      }
      setCommandStatus(
        `Отдана команда возврата дронов: ${targets.length} (симуляция).`,
      )
    } catch {
      setCommandStatus('Не удалось отправить команду возврата дронов.')
    } finally {
      setCommandLoading(false)
    }
  }

  // ----------------- JSX -----------------

  if (stationLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-slate-300">Загрузка данных станции…</p>
      </div>
    )
  }

  if (stationError || !station) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-red-400">{stationError ?? 'Станция не найдена.'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      <button
        type="button"
        onClick={() => navigate('/stations')}
        className="text-sm text-sky-400 hover:text-sky-300"
      >
        ← К списку станций
      </button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] items-start">
        {/* Левая колонка: станция + дроны */}
        <div className="space-y-4">
          {/* Карточка станции */}
          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6">
            <h1 className="text-2xl font-semibold text-white">
              {station.name}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {station.coords.lat}, {station.coords.lng}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-slate-400 text-sm mb-1">Дроны</p>
                <p className="text-slate-100 text-sm">
                  Активно:{' '}
                  <span className="font-semibold">
                    {dronesOnMission.length + dronesReturning.length} /{' '}
                    {drones.length}
                  </span>
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  На задании: {dronesOnMission.length}, возвращаются:{' '}
                  {dronesReturning.length}
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-sm mb-1">Средний заряд</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500"
                      style={{ width: `${battery}%` }}
                    />
                  </div>
                  <span className="text-slate-100 text-sm">{battery}%</span>
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-sm mb-1">Статус станции</p>
                {station.status === 'online' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-600/20 text-emerald-300 text-sm">
                    ● Online
                  </span>
                )}
                {station.status === 'offline' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-500/30 text-slate-200 text-sm">
                    ● Offline
                  </span>
                )}
                {station.status === 'error' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-600/20 text-rose-300 text-sm">
                    ● Ошибка
                  </span>
                )}
              </div>

              <div>
                <p className="text-slate-400 text-sm mb-1">Режим работы</p>
                <p className="text-slate-100">
                  Непрерывно, 8 часов/сутки (по ТЗ)
                </p>
              </div>
            </div>
          </div>

          {/* Карточка дронов станции */}
          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-1">Дроны станции</h2>
            <p className="text-slate-400 text-sm mb-4">
              Список дронов, закреплённых за данной станцией.
            </p>

            {dronesLoading && (
              <p className="text-slate-300 text-sm">Загрузка дронов…</p>
            )}

            {dronesError && (
              <p className="text-red-400 text-sm">{dronesError}</p>
            )}

            {!dronesLoading && !dronesError && drones.length === 0 && (
              <p className="text-slate-400 text-sm">Дронов нет.</p>
            )}

            <div className="space-y-3">
              {drones.map((d) => {
                const riskSummary = riskByDrone[d.id]
                const telemetry = telemetryByDrone[d.id]

                return (
                  <div
                    key={d.id}
                    className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-2xl bg-slate-900/70 border border-slate-700/60 px-4 py-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-slate-100 font-semibold text-sm">
                          {d.name}
                        </h3>
                        {riskSummary && (
                          <span
                            className={
                              'text-[11px] px-2 py-0.5 rounded-full ' +
                              getRiskLevelBadgeClass(riskSummary.level)
                            }
                          >
                            Риск: {getRiskLevelLabel(riskSummary.level)}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Код: {d.code} • Последний контакт: {d.lastContact}
                      </p>
                      <p className="text-slate-300 text-sm mt-1">
                        Заряд:{' '}
                        {telemetry
                          ? `${telemetry.battery}% (по телеметрии)`
                          : `${d.battery}%`}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        {d.mission}
                      </p>
                      {riskSummary && riskSummary.factors.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          Ключевой фактор:{' '}
                          {riskSummary.factors[0].label.toLowerCase()}.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col gap-2 md:items-end">
                      <button
                        onClick={() => navigate(`/drone/${d.id}`)}
                        className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 rounded-xl text-white text-sm font-medium transition whitespace-nowrap"
                      >
                        Открыть дрон
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Правая колонка: команды станции + погода */}
        <div className="space-y-4">
          {/* Команды станции */}
          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-3">Команды станции</h2>

            <p className="text-slate-400 text-sm mb-4">
              Управление дроном на уровне станции.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSendDronesOnMission}
                disabled={commandLoading || isNoFly}
                className={
                  'w-full px-4 py-2 rounded-xl text-sm font-medium transition ' +
                  (commandLoading || isNoFly
                    ? 'bg-sky-600/40 text-slate-300 cursor-not-allowed'
                    : 'bg-sky-600 hover:bg-sky-700 text-white')
                }
              >
                Отправить дронов на задание
              </button>

              <button
                type="button"
                onClick={handleReturnDronesToStation}
                disabled={commandLoading}
                className={
                  'w-full px-4 py-2 rounded-xl text-sm font-medium transition ' +
                  (commandLoading
                    ? 'bg-slate-600/60 text-slate-300 cursor-not-allowed'
                    : 'bg-slate-600 hover:bg-slate-500 text-white')
                }
              >
                Вернуть дронов на станцию
              </button>

              <button
                type="button"
                onClick={handleRestartStation}
                disabled={commandLoading}
                className={
                  'w-full px-4 py-2 rounded-xl text-sm font-medium transition ' +
                  (commandLoading
                    ? 'bg-rose-700/50 text-rose-100/80 cursor-not-allowed'
                    : 'bg-rose-700 hover:bg-rose-800 text-white')
                }
              >
                Перезапустить станцию
              </button>
            </div>

            {isNoFly && (
              <p className="mt-3 text-[11px] text-amber-300">
                Отправка дронов на задание заблокирована: текущая оценка
                погоды — «нелётная».
              </p>
            )}

            {commandLoading && (
              <p className="mt-4 text-xs text-slate-300">
                Выполнение команды…
              </p>
            )}

            {commandStatus && !commandLoading && (
              <p className="mt-4 text-xs text-emerald-300">{commandStatus}</p>
            )}

            {!commandStatus && !commandLoading && (
              <p className="mt-4 text-xs text-slate-400/80">
                Статус последних команд появится здесь.
              </p>
            )}
          </div>

          {/* Погодные условия */}
          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-2">Погодные условия</h2>
            <p className="text-slate-400 text-sm mb-4">
              Оценка погоды в районе кластера станции.
            </p>

            {weatherLoading && (
              <p className="text-slate-300 text-sm">Загрузка данных…</p>
            )}

            {weatherError && (
              <p className="text-red-400 text-sm">{weatherError}</p>
            )}

            {!weatherLoading && !weatherError && weather && (
              <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-semibold">
                    {weather.tempC}°C
                  </span>
                  <span
                    className={
                      'text-xs px-3 py-1 rounded-full ' +
                      getWeatherRiskBadgeClass(weather.riskLevel)
                    }
                  >
                    {getWeatherRiskLabel(weather.riskLevel)}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-300">
                  <p>
                    Ветер:{' '}
                    <span className="font-semibold">
                      {weather.windSpeedMs.toFixed(1)} м/с
                    </span>
                    {weather.windGustMs && (
                      <>
                        {' '}
                        (порывы до{' '}
                        <span className="font-semibold">
                          {weather.windGustMs.toFixed(1)} м/с
                        </span>
                        )
                      </>
                    )}
                  </p>
                  {typeof weather.visibilityKm === 'number' && (
                    <p>
                      Видимость:{' '}
                      <span className="font-semibold">
                        {weather.visibilityKm.toFixed(1)} км
                      </span>
                    </p>
                  )}
                  <p className="capitalize">
                    Осадки: {weather.description || 'нет данных'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
