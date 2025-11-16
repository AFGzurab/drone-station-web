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

export function StationDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [station, setStation] = useState<Station | null>(null)
  const [stationLoading, setStationLoading] = useState(true)
  const [stationError, setStationError] = useState<string | null>(null)

  const [commandStatus, setCommandStatus] = useState<string | null>(null)
  const [commandLoading, setCommandLoading] = useState(false)

  const [drones, setDrones] = useState<Drone[]>([])
  const [dronesLoading, setDronesLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let mounted = true

    // грузим станцию
    setStationLoading(true)
    setStationError(null)

    fetchStationById(id)
      .then((data) => {
        if (!mounted) return
        if (!data) {
          setStationError('Станция не найдена')
          setStation(null)
        } else {
          setStation(data)
        }
      })
      .catch(() => {
        if (mounted) setStationError('Ошибка загрузки данных станции')
      })
      .finally(() => {
        if (mounted) setStationLoading(false)
      })

    // грузим дронов по stationId
    setDronesLoading(true)
    fetchDronesByStation(id)
      .then((data) => {
        if (mounted) setDrones(data)
      })
      .finally(() => {
        if (mounted) setDronesLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [id])

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

  function renderStatusBadge() {
    if (!station) return null
    if (station.status === 'online') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/40">
          ● Online
        </span>
      )
    }
    if (station.status === 'offline') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-500/10 text-slate-300 text-xs border border-slate-500/40">
          ● Offline
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs border border-rose-500/40">
        ● Ошибка
      </span>
    )
  }

  return (
    <div className="min-h-[calc(100vh-48px)] bg-slate-900 text-white px-6 py-4">
      <button
        onClick={() => navigate('/stations')}
        className="mb-4 text-xs text-slate-400 hover:text-sky-400"
      >
        ← К списку станций
      </button>

      {stationLoading && (
        <div className="text-sm text-slate-400">
          Загрузка информации о станции...
        </div>
      )}

      {!stationLoading && stationError && (
        <div className="text-sm text-rose-400">{stationError}</div>
      )}

      {!stationLoading && !stationError && station && (
        <>
          {/* Верхний блок: сама станция + команды */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Информация о станции */}
            <div className="lg:col-span-2 bg-slate-800/80 rounded-2xl border border-slate-700/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-semibold">{station.name}</h1>
                  <p className="text-sm text-slate-400">{station.location}</p>
                </div>
                {renderStatusBadge()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Дроны</div>
                  <div>
                    Активно: {station.dronesActive} / {station.dronesTotal}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">
                    Средний заряд
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-sky-500"
                        style={{ width: `${station.batteryLevel}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-200 w-10 text-right">
                      {station.batteryLevel}%
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">
                    Режим работы
                  </div>
                  <div>Непрерывно, 8 часов/сутки (по ТЗ)</div>
                </div>
              </div>
            </div>

            {/* Команды станции */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 p-5">
              <h2 className="text-sm font-medium mb-3">Команды станции</h2>

              <div className="space-y-2 text-sm">
                <button
                  disabled={commandLoading}
                  onClick={() => handleCommand('send_drone')}
                  className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-sm font-medium"
                >
                  Отправить дрон на задание
                </button>

                <button
                  disabled={commandLoading}
                  onClick={() => handleCommand('return_drone')}
                  className="w-full py-2 rounded-xl bg-slate-600 hover:bg-slate-500 disabled:opacity-60 text-sm font-medium"
                >
                  Вернуть дрон на станцию
                </button>

                <button
                  disabled={commandLoading}
                  onClick={() => handleCommand('restart_station')}
                  className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-sm font-medium"
                >
                  Перезапустить станцию
                </button>
              </div>

              {commandStatus && (
                <p className="mt-3 text-xs text-emerald-400">
                  {commandStatus}
                </p>
              )}

              {commandLoading && (
                <p className="mt-2 text-xs text-slate-400">
                  Выполнение команды...
                </p>
              )}
            </div>
          </div>

          {/* Нижний блок: дроны станции */}
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-medium">Дроны станции</h2>
                <p className="text-xs text-slate-400">
                  Список дронов, закреплённых за данной станцией.
                </p>
              </div>
            </div>

            {dronesLoading && (
              <p className="text-xs text-slate-400">
                Загрузка списка дронов...
              </p>
            )}

            {!dronesLoading && drones.length === 0 && (
              <p className="text-xs text-slate-400">
                Для этой станции ещё не привязаны дроны (фейковые данные).
              </p>
            )}

            {!dronesLoading && drones.length > 0 && (
              <div className="space-y-2 text-sm">
                {drones.map((drone) => (
                  <div
                    key={drone.id}
                    className="flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-900/60 px-4 py-3"
                  >
                    <div>
                      <div className="font-medium">{drone.name}</div>
                      <div className="text-xs text-slate-400 mb-1">
                        Код: {drone.code} • Последний контакт:{' '}
                        {drone.lastContact}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Заряд:</span>
                        <div className="w-32 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full ${
                              drone.battery > 60
                                ? 'bg-emerald-500'
                                : drone.battery > 30
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${drone.battery}%` }}
                          />
                        </div>
                        <span className="w-8 text-right">
                          {drone.battery}%
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {/* статус */}
                      <span
                        className={
                          drone.status === 'idle'
                            ? 'inline-flex items-center px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-200 text-[11px] border border-slate-500/40'
                            : drone.status === 'on_mission'
                            ? 'inline-flex items-center px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-[11px] border border-sky-500/40'
                            : drone.status === 'returning'
                            ? 'inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] border border-emerald-500/40'
                            : 'inline-flex items-center px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[11px] border border-rose-500/40'
                        }
                      >
                        {drone.status === 'idle' && '● Ожидает задания'}
                        {drone.status === 'on_mission' && '● На задании'}
                        {drone.status === 'returning' &&
                          '● Возвращается на станцию'}
                        {drone.status === 'error' && '● Ошибка'}
                      </span>

                      <button
                        onClick={() => navigate(`/drone/${drone.id}`)}
                        className="px-3 py-1 rounded-xl bg-sky-500 hover:bg-sky-600 text-xs"
                      >
                        Открыть дрон
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}