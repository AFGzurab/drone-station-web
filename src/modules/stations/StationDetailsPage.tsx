// src/modules/stations/StationDetailsPage.tsx

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchStationById,
  sendStationCommand,
  type Station,
  type StationCommand,
} from '../../shared/api/stations'
import {
  fetchDronesByStation,
  type Drone,
} from '../../shared/api/drones'
import {
  fetchWeather,
  type WeatherInfo,
  type WeatherRiskLevel,
} from '../../shared/api/weather'

// --- вспомогалки для отображения погодного риска ---

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

export default function StationDetailsPage() {
  // сразу даём id значение по умолчанию
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

  // Погода для кластера станций
  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  // --- Загрузка станции и дронов ---
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

  // --- Загрузка погоды (один раз при заходе на страницу) ---
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

    return () => {
      cancelled = true
    }
  }, [])

  async function handleCommand(command: StationCommand) {
    if (!id) return

    setCommandLoading(true)
    setCommandStatus(null)

    try {
      const res = await sendStationCommand(id, command)
      setCommandStatus(res.message)
    } catch {
      setCommandStatus('Ошибка выполнения команды (фейк).')
    } finally {
      setCommandLoading(false)
    }
  }

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

  const battery = station.batteryAvg ?? station.batteryLevel ?? 0

  const isNoFly = weather?.riskLevel === 'no_fly'
  const isWarning = weather?.riskLevel === 'warning'

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
              <p className="text-slate-300 text-sm">Загрузка дронов...</p>
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
                  <div className="flex items-center gap-4">
                    <div className="text-slate-400 text-xs">
                      {d.mission}
                    </div>
                    <button
                      onClick={() => navigate(`/drone/${d.id}`)}
                      className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 rounded-xl text-white text-sm transition"
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
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6 h-fit">
          <h2 className="text-lg font-semibold mb-4">Команды станции</h2>

          {/* Блок погоды */}
          <div className="mb-4">
            <p className="text-slate-400 text-sm mb-1">Погодные условия</p>
            {weatherLoading && (
              <p className="text-xs text-slate-300">
                Загрузка данных о погоде...
              </p>
            )}
            {!weatherLoading && weatherError && (
              <p className="text-xs text-amber-300">
                {weatherError} Команды доступны, решение принимает оператор.
              </p>
            )}
            {!weatherLoading && !weatherError && weather && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                <span className="font-semibold">{weather.tempC}°C</span>
                <span
                  className={
                    'px-2 py-0.5 rounded-full ' +
                    getRiskBadgeClass(weather.riskLevel)
                  }
                >
                  {getRiskLabel(weather.riskLevel)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
              // 🔴 БЛОКИРУЕМ пока погода грузится + при no_fly
              disabled={commandLoading || weatherLoading || isNoFly}
              onClick={() => handleCommand('send')}
            >
              Отправить дрон на задание
            </button>

            <button
              className="w-full py-2 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-medium transition disabled:opacity-60"
              disabled={commandLoading}
              onClick={() => handleCommand('return')}
            >
              Вернуть дрон на станцию
            </button>

            <button
              className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium transition disabled:opacity-60"
              disabled={commandLoading}
              onClick={() => handleCommand('restart')}
            >
              Перезапустить станцию
            </button>
          </div>

          {/* Подсказки по безопасности */}
          {weatherLoading && (
            <p className="mt-4 text-xs text-slate-400">
              Ожидаем данные погоды от метеосервиса. Запуск на задание временно
              заблокирован.
            </p>
          )}

          {!weatherLoading && isNoFly && (
            <p className="mt-4 text-xs text-rose-300">
              Нелётная погода. Запуск дронов на задание временно заблокирован
              по регламенту безопасности.
            </p>
          )}

          {!weatherLoading && !isNoFly && isWarning && (
            <p className="mt-4 text-xs text-amber-300">
              Погодные условия осложнены. Запуск разрешён, но требует
              повышенной осторожности.
            </p>
          )}

          {commandStatus && (
            <p className="mt-4 text-xs text-emerald-300">
              {commandStatus}
            </p>
          )}

          {commandLoading && (
            <p className="mt-4 text-xs text-slate-300">
              Выполнение команды...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
