// src/modules/stations/StationsListPage.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchStations,
  type Station,
} from '../../shared/api/stations'
import { StationStatusBadge } from './StationStatusBadge'

export function StationsListPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchStations()
      .then((data) => {
        if (mounted) {
          setStations(data)
        }
      })
      .catch((err) => {
        console.error(err)
        if (mounted) {
          setError('Не удалось загрузить список станций')
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="min-h-[calc(100vh-48px)] bg-slate-900 text-white px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Станции</h1>
          <p className="text-sm text-slate-400">
            Мониторинг и управление дрон-станциями.
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-slate-300">Загрузка станций...</p>
      )}

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      {!loading && !error && stations.length === 0 && (
        <p className="text-sm text-slate-300">
          Станции не найдены.
        </p>
      )}

      {!loading && !error && stations.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-400">
                  Станция
                </th>
                <th className="text-left px-4 py-2 font-medium text-slate-400">
                  Статус
                </th>
                <th className="text-left px-4 py-2 font-medium text-slate-400">
                  Дроны
                </th>
                <th className="text-left px-4 py-2 font-medium text-slate-400">
                  Заряд
                </th>
                <th className="text-right px-4 py-2 font-medium text-slate-400">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {stations.map((station) => (
                <tr
                  key={station.id}
                  className="border-b border-slate-800/60 hover:bg-slate-900/60 transition"
                >
                  <td className="px-4 py-2 align-middle">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {station.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {station.location}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <StationStatusBadge status={station.status} />
                  </td>
                  <td className="px-4 py-2 align-middle text-sm">
                    {station.dronesActive} / {station.dronesTotal}
                  </td>
                  <td className="px-4 py-2 align-middle text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500"
                          style={{ width: `${station.batteryLevel}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-300">
                        {station.batteryLevel}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 align-middle text-right">
                    <Link
                      to={`/stations/${station.id}`}
                      className="inline-flex text-xs px-3 py-1 rounded-lg border border-slate-600 hover:border-sky-400 hover:text-sky-300 transition"
                    >
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}