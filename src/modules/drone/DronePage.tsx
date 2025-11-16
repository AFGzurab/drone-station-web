// src/modules/drone/DronePage.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Drone } from '../../shared/api/drones'
import {
  fetchDroneById,
  sendDroneCommand,
  type DroneCommand,
} from '../../shared/api/drones'

export function DronePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [drone, setDrone] = useState<Drone | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commandStatus, setCommandStatus] = useState<string | null>(null)
  const [commandLoading, setCommandLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    let mounted = true
    setLoading(true)
    setError(null)

    fetchDroneById(id)
      .then((data) => {
        if (!mounted) return
        if (!data) {
          setError('Дрон не найден')
          setDrone(null)
        } else {
          setDrone(data)
        }
      })
      .catch(() => {
        if (mounted) setError('Ошибка загрузки данных дрона')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [id])

  async function handleCommand(command: DroneCommand) {
    if (!id) return
    setCommandLoading(true)
    setCommandStatus(null)
    try {
      const res = await sendDroneCommand(id, command)
      setCommandStatus(res.message)
    } catch {
      setCommandStatus('Ошибка выполнения команды (фейк).')
    } finally {
      setCommandLoading(false)
    }
  }

  const statusBadge = (() => {
    if (!drone) return null
    switch (drone.status) {
      case 'idle':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-500/10 text-slate-200 text-xs border border-slate-500/50">
            ● Ожидает задания
          </span>
        )
      case 'on_mission':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs border border-sky-500/50">
            ● На задании
          </span>
        )
      case 'returning':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/50">
            ● Возвращается на станцию
          </span>
        )
      case 'error':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs border border-rose-500/50">
            ● Ошибка
          </span>
        )
      default:
        return null
    }
  })()

  return (
    <div className="min-h-[calc(100vh-48px)] bg-slate-900 text-white px-6 py-4">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-xs text-slate-400 hover:text-sky-400"
      >
        ← Назад
      </button>

      {loading && (
        <div className="text-sm text-slate-400">Загрузка информации о дроне...</div>
      )}

      {!loading && error && (
        <div className="text-sm text-rose-400">{error}</div>
      )}

      {!loading && !error && drone && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Левая часть — информация о дроне */}
          <div className="lg:col-span-2 bg-slate-800/80 rounded-2xl border border-slate-700/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold">{drone.name}</h1>
                <p className="text-sm text-slate-400">
                  Код дрона: {drone.code} • Станция: {drone.stationId}
                </p>
              </div>
              {statusBadge}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <div className="text-xs text-slate-400 mb-1">Текущая миссия</div>
                <div>{drone.mission}</div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Последний контакт</div>
                <div>{drone.lastContact}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Заряд аккумулятора</span>
                <span className="text-xs text-slate-200">{drone.battery}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
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
            </div>
          </div>

          {/* Правая часть — команды управления */}
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 p-5">
            <h2 className="text-sm font-medium mb-3">Команды дрону</h2>

            <div className="space-y-2 text-sm">
              <button
                disabled={commandLoading}
                onClick={() => handleCommand('send_on_mission')}
                className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-sm font-medium"
              >
                Отправить на задание
              </button>

              <button
                disabled={commandLoading}
                onClick={() => handleCommand('return_to_station')}
                className="w-full py-2 rounded-xl bg-slate-600 hover:bg-slate-500 disabled:opacity-60 text-sm font-medium"
              >
                Вернуть на станцию
              </button>

              <button
                disabled={commandLoading}
                onClick={() => handleCommand('force_land')}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-sm font-medium"
              >
                Экстренная посадка
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
      )}
    </div>
  )
}