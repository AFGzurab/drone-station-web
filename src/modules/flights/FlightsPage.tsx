// src/modules/flights/FlightsPage.tsx

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchFlights,
  type Flight,
  type FlightStatus,
} from '../../shared/api/flights'

type FlightFilter = 'all' | FlightStatus

function getStatusBadgeClasses(status: FlightStatus): string {
  switch (status) {
    case 'in_progress':
      return 'bg-sky-500/15 text-sky-300'
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-300'
    case 'aborted':
      return 'bg-rose-500/15 text-rose-300'
    case 'planned':
    default:
      return 'bg-slate-500/20 text-slate-200'
  }
}

function getStatusLabel(status: FlightStatus): string {
  switch (status) {
    case 'planned':
      return 'Запланирован'
    case 'in_progress':
      return 'Выполняется'
    case 'completed':
      return 'Завершён'
    case 'aborted':
      return 'Прерван'
    default:
      return status
  }
}

export default function FlightsPage() {
  const navigate = useNavigate()

  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FlightFilter>('all')

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchFlights()
        setFlights(data)
      } catch {
        setError('Не удалось загрузить историю полётов.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filteredFlights =
    filter === 'all'
      ? flights
      : flights.filter((f) => f.status === filter)

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">История полётов</h1>
          <p className="text-slate-400">
            Журнал выполненных и активных миссий дронов.
          </p>
        </div>

        {/* Простая сводка справа */}
        <div className="hidden md:flex flex-col items-end text-sm text-slate-400">
          <span>Всего полётов: {flights.length}</span>
          <span className="text-xs text-slate-500">
            Активных: {flights.filter((f) => f.status === 'in_progress').length}
          </span>
        </div>
      </div>

      {/* Фильтры по статусу */}
      <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl px-4 py-3 flex flex-wrap gap-2 text-sm">
        <span className="text-slate-400 mr-2">Фильтр по статусу:</span>

        {[
          { id: 'all' as FlightFilter, label: 'Все' },
          { id: 'in_progress' as FlightFilter, label: 'Выполняются' },
          { id: 'completed' as FlightFilter, label: 'Завершённые' },
          { id: 'aborted' as FlightFilter, label: 'Прерванные' },
          { id: 'planned' as FlightFilter, label: 'Запланированные' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={[
              'px-3 py-1 rounded-full border text-xs md:text-sm transition',
              filter === item.id
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-slate-900/40 text-slate-300 border-slate-600 hover:border-slate-400',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Состояния загрузки / ошибки */}
      {loading && (
        <p className="text-slate-300">Загрузка истории полётов...</p>
      )}

      {error && !loading && (
        <p className="text-rose-400 font-medium">{error}</p>
      )}

      {!loading && !error && (
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {filter === 'all' ? 'Все полёты' : 'Отфильтрованные полёты'}
            </h2>
            <span className="text-xs text-slate-400">
              Показано: {filteredFlights.length}
            </span>
          </div>

          {filteredFlights.length === 0 ? (
            <p className="text-slate-400 text-sm">
              Для выбранного фильтра полётов пока нет.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-auto w-full text-left">
                <thead className="text-slate-300 text-xs md:text-sm border-b border-slate-700">
                  <tr>
                    <th className="py-3 pr-2">Дрон</th>
                    <th className="py-3 pr-2 hidden md:table-cell">
                      Станция
                    </th>
                    <th className="py-3 pr-2">Время</th>
                    <th className="py-3 pr-2 text-center">Статус</th>
                    <th className="py-3 pr-2 text-right">Дистанция</th>
                    <th className="py-3 pl-2 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200 text-xs md:text-sm">
                  {filteredFlights.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-slate-700/40 hover:bg-slate-700/25 transition"
                    >
                      <td className="py-3 pr-2">
                        <div className="font-medium">{f.droneName}</div>
                        <div className="text-slate-400 text-xs">
                          Код: {f.droneId.toUpperCase()}
                        </div>
                      </td>

                      <td className="py-3 pr-2 hidden md:table-cell">
                        <div className="text-sm">{f.stationName}</div>
                        <div className="text-slate-500 text-xs">
                          {f.stationId}
                        </div>
                      </td>

                      <td className="py-3 pr-2 align-top">
                        <div className="text-xs font-mono text-slate-300">
                          c {f.startTime}
                        </div>
                        {f.endTime && (
                          <div className="text-xs font-mono text-slate-500">
                            до {f.endTime}
                          </div>
                        )}
                      </td>

                      <td className="py-3 pr-2 text-center align-top">
                        <span
                          className={
                            'inline-flex items-center px-3 py-1 rounded-full text-xs ' +
                            getStatusBadgeClasses(f.status)
                          }
                        >
                          {getStatusLabel(f.status)}
                        </span>
                      </td>

                      <td className="py-3 pr-2 text-right align-top whitespace-nowrap">
                        {f.distanceKm.toFixed(1)} км
                      </td>

                      <td className="py-3 pl-2 pr-1 text-right align-top">
                        <button
                          onClick={() => navigate(`/drone/${f.droneId}`)}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 rounded-xl text-xs md:text-sm text-white transition"
                        >
                          Открыть дрон
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
