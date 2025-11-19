// src/modules/stations/StationDetailsPage.tsx

import { useEffect, useState, useMemo } from 'react'
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

export default function StationDetailsPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [station, setStation] = useState<Station | null>(null)
  const [stationLoading, setStationLoading] = useState(true)
  const [stationError, setStationError] = useState<string | null>(null)

  const [drones, setDrones] = useState<Drone[]>([])
  const [dronesLoading, setDronesLoading] = useState(true)
  const [dronesError, setDronesError] = useState<string | null>(null)

  const [commandLoading, setCommandLoading] = useState(false)
  const [commandStatus, setCommandStatus] = useState<string | null>(null)

  // Погода для кластера станции
  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  // -------- загрузка станции и дронов --------
  useEffect(() => {
    if (!id) return

    async function loadStation() {
      try {
        const data = await fetchStationById(id)
        if (!data) {
          setStationError('Станция не найдена.')
        } else {
          setStation(data)
        }
      } catch {
        setStationError('Не удалось загрузить данные станции.')
      } finally {
        setStationLoading(false)
      }
    }

    async function loadDrones() {
      try {
        const list = await fetchDronesByStation(id)
        setDrones(list)
      } catch {
        setDronesError('Не удалось загрузить список дронов.')
      } finally {
        setDronesLoading(false)
      }
    }

    loadStation()
    loadDrones()
  }, [id])

  // -------- погода + автообновление --------
  useEffect(() => {
    let cancelled = false

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
    const idTimer = window.setInterval(loadWeather, 10 * 60 * 1000)

    return () => {
      cancelled = true
      window.clearInterval(idTimer)
    }
  }, [])

  // --- простые производные значения ---
  const battery = station?.batteryAvg ?? station?.batteryLevel ?? 0

  const dronesIdle = useMemo(
    () => drones.filter((d) => d.status === 'idle'),
    [drones],
  )

  const dronesOnMission = useMemo(
    () => drones.filter((d) => d.status === 'on_mission'),
    [drones],
  )

  const commandsDisabled =
    commandLoading ||
    weatherLoading || // пока погода грузится — блокируем
    (!!weather && weather.riskLevel === 'no_fly')

  // -------- массовые команды дронам станции --------

  async function handleMassDroneCommand(kind: 'send' | 'return') {
    if (!station) return

    setCommandLoading(true)
    setCommandStatus(null)

    try {
      const targetDrones =
        kind === 'send' ? dronesIdle : dronesOnMission

      if (targetDrones.length === 0) {
        setCommandStatus(
          kind === 'send'
            ? 'Нет дронов, ожидающих задания на этой станции.'
            : 'Нет дронов на задании для возврата.',
        )
        return
      }

      await Promise.all(
        targetDrones.map((d) =>
          sendDroneCommand(
            d.id,
            kind === 'send' ? 'send_on_mission' : 'return_to_station',
          ),
        ),
      )

      setCommandStatus(
        kind === 'send'
          ? `Отправлено дронов на задание: ${targetDrones.length}`
          : `Отправлено команд на возврат: ${targetDrones.length}`,
      )

      // обновим список дронов станции после команды
      const updated = await fetchDronesByStation(station.id)
      setDrones(updated)
    } catch {
      setCommandStatus('Ошибка выполнения команды (симуляция).')
    } finally {
      setCommandLoading(false)
    }
  }

  // перезапуск станции остаётся станционной командой
  async function handleStationRestart() {
    if (!id) return

    setCommandLoading(true)
    setCommandStatus(null)

    try {
      const res = await sendStationCommand(id, 'restart')
      setCommandStatus(res.message)
    } catch {
      setCommandStatus('Ошибка выполнения команды станции (фейк).')
    } finally {
      setCommandLoading(false)
    }
  }

  // -------- рендер --------

  if (stationLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-slate-300">Загрузка станции...</p>
      </div>
    )
  }

  if (stationError || !station) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-red-400 font-medium">
          {stationError ?? 'Станция не найдена.'}
        </p>
        <button
          className="mt-4 text-sky-400 hover:text-sky-300"
          onClick={() => navigate('/stations')}
        >
          ← К списку станций
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      <button
        className="text-sky-400 hover:text-sky-300 text-sm"
        onClick={() => navigate('/stations')}
      >
        ← К списку станций
      </button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        {/* Левая колонка */}
        <div className="space-y-6">
          {/* Информация о станции */}
          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6">
            <h1 className="text-2xl font-bold mb-1">{station.name}</h1>
            <p className="text-slate-400 text-sm">
              {station.coords.lat}, {station.coords.lng}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-slate-400 text-sm mb-1">Дроны</p>
                <p className="text-slate-100">
                  <span className="font-semibold">
                    Активно: {station.dronesActive}
                  </span>{' '}
                  / {station.dronesTotal}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">
                  Средний заряд
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500"
                      style={{ width: `${battery}%` }}
                    />
                  </div>
                  <span className="text-slate-100 text-sm">
                    {battery}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-slate-400 text-sm mb-1">Статус станции</p>
              {station.status === 'online' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-600/20 text-emerald-300 text-sm">
                  ● Online
                </span>
              )}
              {station.status === 'offline' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-500/20 text-slate-300 text-sm">
                  ● Offline
                </span>
              )}
              {station.status === 'error' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-600/20 text-rose-300 text-sm">
                  ● Ошибка
                </span>
              )}
            </div>

            <div className="mt-4">
              <p className="text-slate-400 text-sm mb-1">Режим работы</p>
              <p className="text-slate-100">
                Непрерывно, 8 часов/сутки (по ТЗ)
              </p>
            </div>
          </div>

          {/* Дроны станции */}
          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-1">Дроны станции</h2>
            <p className="text-slate-400 text-sm mb-4">
              Список дронов, закреплённых за данной станцией.
            </p>

            {dronesLoading && (
              <p className="text-slate-300 text-sm">
                Загрузка дронов...
              </p>
            )}

            {dronesError && (
              <p className="text-red-400 text-sm">{dronesError}</p>
            )}

            {!dronesLoading && !dronesError && drones.length === 0 && (
              <p className="text-slate-400 text-sm">Дронов нет.</p>
            )}

            <div className="space-y-3">
              {drones.map((d) => (
                <div
                  key={d.id}
                  className="bg-slate-900/40 rounded-2xl border border-slate-700/60 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-slate-400 text-xs">
                      Код: {d.code} • Последний контакт: {d.lastContact}
                    </p>
                    <p className="text-slate-300 text-sm mt-1">
                      Заряд: {d.battery}%
                    </p>
                  </div>

                  {/* блок миссии + кнопка с фиксированной шириной */}
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 md:min-w-[260px] md:justify-end">
                    <div className="text-slate-400 text-xs md:text-right">
                      {d.mission}
                    </div>
                    <button
                      onClick={() => navigate(`/drone/${d.id}`)}
                      className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 rounded-xl text-white text-sm font-medium transition whitespace-nowrap min-w-[140px] text-center"
                    >
                      Открыть дрон
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Правая колонка: команды станции + погода */}
        <div className="space-y-4">
          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6 h-fit">
            <h2 className="text-lg font-semibold mb-4">
              Команды станции
            </h2>

            {/* мини-блок погоды прямо над кнопками */}
            <div className="mb-4 rounded-xl bg-slate-900/60 border border-slate-700/70 px-4 py-3">
              <p className="text-xs text-slate-400 mb-1">
                Погодные условия — кластер станции
              </p>

              {weatherLoading && (
                <p className="text-xs text-slate-300">
                  Загрузка погодных данных...
                </p>
              )}

              {!weatherLoading && weatherError && (
                <p className="text-xs text-rose-300">{weatherError}</p>
              )}

              {!weatherLoading && !weatherError && weather && (
                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">
                      {weather.tempC}°C
                    </span>
                    <span
                      className={
                        'px-3 py-0.5 rounded-full text-[11px] ' +
                        getRiskBadgeClass(weather.riskLevel)
                      }
                    >
                      {getRiskLabel(weather.riskLevel)}
                    </span>
                  </div>
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
                  <p>Осадки: {weather.description || 'нет данных'}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Обновлено: {formatUpdatedAt(weather.updatedAt)}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={commandsDisabled}
                onClick={() => handleMassDroneCommand('send')}
              >
                Отправить дронов на задание
              </button>

              <button
                className="w-full py-2 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={commandsDisabled}
                onClick={() => handleMassDroneCommand('return')}
              >
                Вернуть дронов на станцию
              </button>

              <button
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={commandLoading}
                onClick={handleStationRestart}
              >
                Перезапустить станцию
              </button>
            </div>

            {commandLoading && (
              <p className="mt-4 text-xs text-slate-300">
                Выполнение команды...
              </p>
            )}

            {commandStatus && !commandLoading && (
              <p className="mt-4 text-xs text-emerald-300">
                {commandStatus}
              </p>
            )}

            {!commandStatus && !commandLoading && (
              <p className="mt-4 text-xs text-slate-400/80">
                Статус последних команд появится здесь.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
