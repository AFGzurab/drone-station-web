// src/modules/admin/AdminPage.tsx

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { fetchStations, type Station } from '../../shared/api/stations'
import {
  fetchWeather,
  type WeatherInfo,
  type WeatherRiskLevel,
  getWeatherSimulationMode,
  setWeatherSimulationMode,
} from '../../shared/api/weather'
import {
  getRecentEvents,
  subscribeToEvents,
  type SystemEvent,
  type SystemEventLevel,
  type SystemEventSource,
} from '../../shared/api/events'
import { startDemoScenario } from '../../shared/api/demoScenario'

// ----- helpers для погоды -----

function getRiskLabel(level: WeatherRiskLevel): string {
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

function getRiskBadgeClass(level: WeatherRiskLevel): string {
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

function formatUpdatedAt(ts: number | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

type LevelFilter = 'all' | SystemEventLevel
type SourceFilter = 'all' | SystemEventSource

export default function AdminPage() {
  const navigate = useNavigate()

  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Погода
  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  // Текущий режим симуляции погоды
  const [simulationMode, setSimulationMode] = useState<WeatherRiskLevel | null>(
    null,
  )

  // DEMO-сценарий
  const [demoRunning, setDemoRunning] = useState(false)

  // Системные события
  const [events, setEvents] = useState<SystemEvent[]>([])

  // Фильтры событий
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  // Подсчёт количества станций по статусам
  const onlineCount = stations.filter((s) => s.status === 'online').length
  const errorCount = stations.filter((s) => s.status === 'error').length
  const offlineCount = stations.filter((s) => s.status === 'offline').length

  // --- Загрузка станций ---
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchStations()
        setStations(data)
      } catch {
        setError('Не удалось загрузить данные по станциям.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  // --- Загрузка и автообновление погоды ---
  useEffect(() => {
    let cancelled = false

    // восстановим режим симуляции при монтировании
    setSimulationMode(getWeatherSimulationMode())

    async function loadWeather() {
      try {
        if (!cancelled) {
          setWeatherLoading(true)
          setWeatherError(null)
        }

        const data = await fetchWeather()
        if (!cancelled) {
          setWeather(data)
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
    const id = window.setInterval(loadWeather, 5 * 60 * 1000)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  // --- Подписка на системные события ---
  useEffect(() => {
    setEvents(getRecentEvents(50))

    const unsubscribe = subscribeToEvents((ev) => {
      setEvents((prev) => {
        const next = [ev, ...prev]
        return next.slice(0, 50)
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const stats = useMemo(() => {
    const total = stations.length

    const avgBattery =
      stations.length > 0
        ? Math.round(
            stations.reduce(
              (sum, s) => sum + (s.batteryAvg ?? s.batteryLevel ?? 0),
              0,
            ) / stations.length,
          )
        : 0

    const problem = stations.filter((s) => s.status !== 'online').length

    return { total, problem, avgBattery }
  }, [stations])

  const onlinePercent =
    stats.total > 0 ? Math.round((onlineCount / stats.total) * 100) : 0

  // --- Фильтрация событий по уровню и источнику ---
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (levelFilter !== 'all' && ev.level !== levelFilter) return false
      if (sourceFilter !== 'all' && ev.source !== sourceFilter) return false
      return true
    })
  }, [events, levelFilter, sourceFilter])

  // --- Переключатель симуляции нелётной погоды ---
  async function handleToggleNoFlySimulation() {
    try {
      if (simulationMode === 'no_fly') {
        setWeatherSimulationMode(null)
        setSimulationMode(null)
      } else {
        setWeatherSimulationMode('no_fly')
        setSimulationMode('no_fly')
      }

      // сразу обновим блок погоды
      setWeatherLoading(true)
      setWeatherError(null)
      const data = await fetchWeather()
      setWeather(data)
    } catch {
      setWeatherError('Не удалось обновить данные погоды после переключения.')
    } finally {
      setWeatherLoading(false)
    }
  }

  // --- Запуск DEMO-сценария ---
  function handleStartDemoScenario() {
    if (demoRunning) return
    startDemoScenario()
    setDemoRunning(true)

    // через ~30 секунд автоматически считаем, что сценарий завершён
    window.setTimeout(() => {
      setDemoRunning(false)
    }, 32_000)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-slate-300">Загрузка панели администратора.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-red-400 font-medium">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      <h1 className="text-3xl font-bold">Админ-панель</h1>
      <p className="text-slate-400">
        Управление станциями, мониторинг состояния и системные события.
      </p>

      {/* Верхние карточки-сводки */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Всего станций */}
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Всего станций</p>
          <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
        </div>

        {/* Статус станций */}
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Статус станций</h3>
            <p className="mt-1 text-sm text-slate-400">В работе сейчас</p>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-white">
                {onlineCount}
              </span>
              <span className="text-sm text-slate-400">
                из {stats.total} станций
              </span>
            </div>

            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${onlinePercent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {onlinePercent}% инфраструктуры онлайн.
              </p>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-400 space-y-1">
            <p>
              <span className="inline-block w-3 h-1 mr-1 bg-emerald-400 rounded-full" />
              Online: {onlineCount}
            </p>
            <p>
              <span className="inline-block w-3 h-1 mr-1 bg-slate-400 rounded-full" />
              Offline: {offlineCount}
            </p>
            <p>
              <span className="inline-block w-3 h-1 mr-1 bg-rose-400 rounded-full" />
              Ошибка: {errorCount}
            </p>
          </div>
        </div>

        {/* Средний заряд */}
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Средний заряд по станциям</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500"
                style={{ width: `${stats.avgBattery}%` }}
              />
            </div>
            <span className="text-xl font-semibold">
              {stats.avgBattery}%
            </span>
          </div>
        </div>

        {/* Проблемные станции */}
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Проблемные станции</p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">
            {stats.problem}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Количество станций в статусе Offline или Ошибка.
          </p>
        </div>
      </div>

      {/* Блок: Погода + таблица станций + события */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        {/* Левая часть: погода + таблица станций */}
        <div className="space-y-6">
          {/* Погода + тумблер симуляции + DEMO */}
          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Погодные условия</h2>
                <p className="text-slate-400 text-sm">
                  Кластер станций (реальные данные Open-Meteo).
                </p>
              </div>

              {/* Тумблер симуляции + DEMO-кнопка */}
              <div className="flex flex-col items-start sm:items-end gap-2">
                <button
                  type="button"
                  onClick={handleToggleNoFlySimulation}
                  className={
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                    (simulationMode === 'no_fly'
                      ? 'bg-rose-600/20 text-rose-200 border-rose-400'
                      : 'bg-slate-900/80 text-slate-200 border-slate-600 hover:border-sky-400')
                  }
                >
                  {simulationMode === 'no_fly'
                    ? 'Выключить симуляцию нелётной погоды'
                    : 'Сымитировать нелётную погоду'}
                </button>

                <button
                  type="button"
                  onClick={handleStartDemoScenario}
                  disabled={demoRunning}
                  className={
                    'px-3 py-1.5 rounded-full text-xs font-medium transition ' +
                    (demoRunning
                      ? 'bg-sky-600/40 text-slate-300 cursor-not-allowed'
                      : 'bg-sky-600 hover:bg-sky-700 text-white')
                  }
                >
                  {demoRunning
                    ? 'DEMO-сценарий выполняется…'
                    : 'Запустить DEMO-сценарий'}
                </button>

                <p className="text-[11px] text-slate-500 max-w-xs text-right">
                  {simulationMode === 'no_fly'
                    ? 'Сейчас используется принудительный режим: «нелётная погода». Все станции и дроны видят риск no_fly.'
                    : 'Сейчас используется реальная оценка погодного риска по данным Open-Meteo.'}
                </p>
              </div>
            </div>

            <div className="mt-4 bg-slate-900/60 border border-slate-700/70 rounded-2xl px-4 py-3">
              {weatherLoading && (
                <p className="text-sm text-slate-300">
                  Загрузка данных о погоде…
                </p>
              )}

              {!weatherLoading && weatherError && (
                <p className="text-sm text-rose-300">{weatherError}</p>
              )}

              {!weatherLoading && !weatherError && weather && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-semibold">
                      {weather.tempC}°C
                    </span>
                    <span
                      className={
                        'text-xs px-3 py-1 rounded-full ' +
                        getRiskBadgeClass(weather.riskLevel)
                      }
                    >
                      {getRiskLabel(weather.riskLevel)}
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
                </>
              )}
            </div>

            {weather && (
              <p className="mt-3 text-[11px] text-slate-500">
                Обновлено: {formatUpdatedAt(weather.updatedAt)}
              </p>
            )}
          </div>

          {/* Таблица станций */}
          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6 flex flex-col">
            <h2 className="text-lg font-semibold mb-1">Станции</h2>
            <p className="text-slate-400 text-sm mb-4">
              Сводка по всем дрон-станциям.
            </p>

            <div className="overflow-x-auto">
              <table className="table-auto w-full text-left">
                <thead className="text-slate-300 text-sm border-b border-slate-700">
                  <tr>
                    <th className="py-3 pl-2">Станция</th>
                    <th className="py-3 text-center">Статус</th>
                    <th className="py-3 text-center">Дроны</th>
                    <th className="py-3 text-center">Заряд</th>
                    <th className="py-3 pr-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {stations.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-slate-700/40 hover:bg-slate-700/25 transition"
                    >
                      <td className="py-4 pl-2">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-slate-400 text-xs mt-0.5">
                          {s.coords.lat}, {s.coords.lng}
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <span
                          className={
                            'status-badge ' +
                            (s.status === 'online'
                              ? 'status-online'
                              : s.status === 'offline'
                              ? 'status-offline'
                              : 'status-error')
                          }
                        >
                          ●{' '}
                          {s.status === 'online'
                            ? 'Online'
                            : s.status === 'offline'
                            ? 'Offline'
                            : 'Ошибка'}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        {s.dronesActive} / {s.dronesTotal}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex-1 h-2 max-w-[160px] bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-500"
                              style={{ width: `${s.batteryAvg ?? 0}%` }}
                            />
                          </div>
                          <span className="text-slate-300 min-w-[32px] text-right">
                            {s.batteryAvg ?? 0}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-3 text-right">
                        <button
                          onClick={() => navigate(`/stations/${s.id}`)}
                          className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 rounded-xl text-white text-sm transition"
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Правая часть: системные события */}
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6 flex flex-col gap-4 h-[480px]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Системные события</h2>
              <p className="text-slate-400 text-sm">
                Журнал последних операций и уведомлений.
              </p>
            </div>
          </div>

          {/* Панель фильтров */}
          <div className="flex flex-wrap gap-3 items-center text-xs">
            <div className="flex gap-1 items-center flex-wrap">
              <span className="text-slate-400 mr-1">Уровень:</span>
              {(
                [
                  { key: 'all', label: 'Все' },
                  { key: 'info', label: 'INFO' },
                  { key: 'warning', label: 'WARNING' },
                  { key: 'error', label: 'ERROR' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setLevelFilter(opt.key)}
                  className={
                    'px-2 py-1 rounded-full border text-[11px] transition ' +
                    (levelFilter === opt.key
                      ? 'border-sky-400 bg-sky-500/10 text-sky-300'
                      : 'border-slate-600 text-slate-300 hover:border-slate-400')
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <span className="text-slate-400 text-[11px]">Источник:</span>
              <select
                value={sourceFilter}
                onChange={(e) =>
                  setSourceFilter(e.target.value as SourceFilter)
                }
                className="bg-slate-900 border border-slate-600 text-[11px] rounded-lg px-2 py-1 text-slate-100 focus:outline-none focus:border-sky-400"
              >
                <option value="all">Все</option>
                <option value="operator">operator</option>
                <option value="admin">admin</option>
                <option value="system">system</option>
                <option value="monitoring">monitoring</option>
                <option value="security">security</option>
                <option value="service">service</option>
              </select>
            </div>
          </div>

          {/* Список событий — занимает всё оставшееся место и скроллится */}
          <div className="mt-1 flex-1 min-h-0 space-y-2 overflow-y-auto pr-2 scroll-dark">
            {filteredEvents.length === 0 && (
              <p className="text-slate-500 text-sm">
                Нет событий, подходящих под выбранные фильтры.
              </p>
            )}

            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="relative rounded-xl bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 text-sm flex flex-col gap-1 shadow-sm shadow-slate-950/40"
              >
                <span className="absolute left-2 top-2 bottom-2 w-px bg-slate-700/70" />
                <div className="pl-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-mono">
                      {ev.time}
                    </span>
                    <span
                      className={
                        ev.level === 'info'
                          ? 'text-[11px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300'
                          : ev.level === 'warning'
                          ? 'text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300'
                          : 'text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300'
                      }
                    >
                      {ev.level.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-100 leading-snug mt-1">
                    {ev.title}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Источник: {ev.source}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
