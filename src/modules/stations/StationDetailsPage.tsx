// src/modules/stations/StationDetailsPage.tsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  fetchStationById,
  sendStationCommand,
  type Station,
} from '../../shared/api/stations'
import { StationStatusBadge } from './StationStatusBadge'

export function StationDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const [station, setStation] = useState<Station | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commandLoading, setCommandLoading] = useState<
    'send' | 'return' | 'restart' | null
  >(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    fetchStationById(id)
      .then((st) => {
        if (!st) {
          setError('Станция не найдена')
        } else {
          setStation(st)
        }
      })
      .catch((err) => {
        console.error(err)
        setError('Ошибка загрузки данных станции')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  async function handleCommand(
    type: 'send' | 'return' | 'restart',
  ) {
    if (!station) return
    setCommandLoading(type)
    setInfo(null)
    setError(null)
    try {
      if (type === 'send') {
        await sendStationCommand(station.id, 'send_drone')
        setInfo('Команда отправки дрона выполнена (фейк).')
      }
      if (type === 'return') {
        await sendStationCommand(station.id, 'return_drone')
        setInfo('Команда возврата дрона выполнена (фейк).')
      }
      if (type === 'restart') {
        await sendStationCommand(station.id, 'restart')
        setInfo('Команда перезапуска станции выполнена (фейк).')
      }
    } catch (err) {
      console.error(err)
      setError('Не удалось выполнить команду')
    } finally {
      setCommandLoading(null)
    }
  }

  return (
    <div className="min-h-[calc(100vh-48px)] bg-slate-900 text-white px-6 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Детали станции
          </h1>
          <p className="text-sm text-slate-400">
            Управление выбранной дрон-станцией.
          </p>
        </div>

        <Link
          to="/stations"
          className="text-xs px-3 py-1 rounded-lg border border-slate-600 hover:border-sky-400 hover:text-sky-300 transition"
        >
          ← К списку станций
        </Link>
      </div>

      {loading && (
        <p className="text-sm text-slate-300">Загрузка...</p>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {!loading && !error && station && (
        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {station.name}
                </h2>
                <p className="text-xs text-slate-400">
                  {station.location}
                </p>
              </div>
              <StationStatusBadge status={station.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400 text-xs mb-1">
                  Дроны
                </p>
                <p>
                  Активно:{' '}
                  <span className="font-semibold">
                    {station.dronesActive}
                  </span>{' '}
                  / {station.dronesTotal}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">
                  Средний заряд
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500"
                      style={{ width: `${station.batteryLevel}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-300">
                    {station.batteryLevel}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="text-sm font-semibold mb-3">
              Команды станции
            </h3>

            <div className="space-y-2 text-sm">
              <button
                onClick={() => handleCommand('send')}
                disabled={!!commandLoading}
                className="w-full px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-60 transition text-sm"
              >
                {commandLoading === 'send'
                  ? 'Отправка дрона...'
                  : 'Отправить дрон на задание'}
              </button>

              <button
                onClick={() => handleCommand('return')}
                disabled={!!commandLoading}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 transition text-sm"
              >
                {commandLoading === 'return'
                  ? 'Возврат дрона...'
                  : 'Вернуть дрон на станцию'}
              </button>

              <button
                onClick={() => handleCommand('restart')}
                disabled={!!commandLoading}
                className="w-full px-3 py-2 rounded-lg bg-red-500/90 hover:bg-red-500 disabled:opacity-60 transition text-sm"
              >
                {commandLoading === 'restart'
                  ? 'Перезапуск...'
                  : 'Перезапустить станцию'}
              </button>
            </div>

            {info && (
              <p className="text-xs text-emerald-300 mt-3">
                {info}
              </p>
            )}
            {error && (
              <p className="text-xs text-red-400 mt-2">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}