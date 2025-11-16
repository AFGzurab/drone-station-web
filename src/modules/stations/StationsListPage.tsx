// src/modules/stations/StationsListPage.tsx

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStations, type Station } from '../../shared/api/stations'

export default function StationsListPage() {
  const navigate = useNavigate()

  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchStations()
        setStations(data)
      } catch {
        setError('Не удалось загрузить список станций.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return <p className="text-center mt-10 text-slate-300">Загрузка...</p>
  }

  if (error) {
    return (
      <p className="text-center mt-10 text-red-400 font-medium">{error}</p>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <h1 className="text-3xl font-bold">Станции</h1>
      <p className="text-slate-400 mt-1">
        Мониторинг и управление дрон-станциями.
      </p>

      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">Список станций</h2>

        <div className="overflow-x-auto">
          <table className="table-auto w-full text-left">
            <thead className="text-slate-300 text-sm border-b border-slate-700">
              <tr>
                <th className="py-3 pl-2 w-[35%]">Станция</th>
                <th className="py-3 text-center w-[15%]">Статус</th>
                <th className="py-3 text-center w-[10%]">Дроны</th>
                <th className="py-3 text-center w-[25%]">Заряд</th>
                <th className="py-3 text-right w-[15%] pr-4">Действия</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {stations.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-700/40 hover:bg-slate-700/20 transition"
                >
                  {/* Название станции + координаты */}
                  <td className="py-4 pl-2 font-medium">
                    {s.name}
                    <div className="text-slate-400 text-sm">
                      {s.coords.lat}, {s.coords.lng}
                    </div>
                  </td>

                  {/* Статус */}
                  <td className="py-4 text-center">
                    {s.status === 'online' && (
                      <span className="inline-flex items-center px-3 py-1 bg-emerald-600/20 text-emerald-300 rounded-full text-sm">
                        ● Online
                      </span>
                    )}
                    {s.status === 'offline' && (
                      <span className="inline-flex items-center px-3 py-1 bg-slate-500/20 text-slate-300 rounded-full text-sm">
                        ● Offline
                      </span>
                    )}
                    {s.status === 'error' && (
                      <span className="inline-flex items-center px-3 py-1 bg-rose-600/20 text-rose-300 rounded-full text-sm">
                        ● Ошибка
                      </span>
                    )}
                  </td>

                  {/* Дроны */}
                  <td className="py-4 text-center">
                    {s.dronesActive} / {s.dronesTotal}
                  </td>

                  {/* Заряд */}
                  <td className="py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex-1 h-2 max-w-[160px] bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500"
                          style={{ width: `${s.batteryAvg}%` }}
                        />
                      </div>
                      <span className="text-slate-300 min-w-[32px] text-right">
                        {s.batteryAvg}%
                      </span>
                    </div>
                  </td>

                  {/* Кнопка */}
                  <td className="py-4 pr-4 text-right">
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
  )
}