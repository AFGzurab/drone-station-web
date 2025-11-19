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
      return 'bg-slate-500/20 text-slate-200'
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

function getStatusDotClasses(status: FlightStatus): string {
  switch (status) {
    case 'in_progress':
      return 'bg-sky-400'
    case 'completed':
      return 'bg-emerald-400'
    case 'aborted':
      return 'bg-rose-400'
    case 'planned':
      return 'bg-slate-400'
    default:
      return 'bg-slate-400'
  }
}

function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return '-'
  if (km < 1) return `${Math.round(km * 1000)} м`
  return `${km.toFixed(1)} км`
}

function formatDateTime(value: string): string {
  return value
}

function FlightsPage() {
  const navigate = useNavigate()

  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<FlightFilter>('all')

  useEffect(() => {
    let cancelled = false

    async function loadFlights() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchFlights()
        if (!cancelled) {
          setFlights(data)
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setError(
            'Не удалось загрузить историю полётов. Попробуйте обновить страницу.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadFlights()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredFlights =
    statusFilter === 'all'
      ? flights
      : flights.filter((f) => f.status === statusFilter)

  const activeCount = flights.filter((f) => f.status === 'in_progress').length

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-slate-300">Загрузка истории полётов...</p>
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
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Заголовок — как в админке */}
      <div>
        <h1 className="text-3xl font-bold">История полётов</h1>
        <p className="text-slate-400">
          Журнал выполненных и активных миссий дронов.
        </p>
      </div>

      {/* Верхние карточки */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Фильтр */}
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-200">
            Фильтр по статусу
          </h2>
          <p className="text-xs text-slate-400 mt-1 mb-3">
            Выберите, какие полёты отображать в таблице ниже.
          </p>

          <div className="flex flex-wrap gap-2">
            {([
              { value: 'all', label: 'Все' },
              { value: 'in_progress', label: 'Выполняются' },
              { value: 'completed', label: 'Завершённые' },
              { value: 'aborted', label: 'Прерванные' },
              { value: 'planned', label: 'Запланированные' },
            ] satisfies { value: FlightFilter; label: string }[]).map(
              ({ value, label }) => {
                const isActive = statusFilter === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs md:text-sm font-medium border transition',
                      isActive
                        ? 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-900/40'
                        : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-slate-50',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                )
              },
            )}
          </div>
        </div>

        {/* Всего полётов */}
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-slate-400 text-sm">Всего полётов</p>
            <p className="mt-1 text-2xl font-semibold text-slate-50">
              {flights.length}
            </p>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            <p>
              Завершённых:{' '}
              <span className="text-emerald-300 font-medium">
                {flights.filter((f) => f.status === 'completed').length}
              </span>
            </p>
            <p>
              Прерванных:{' '}
              <span className="text-rose-300 font-medium">
                {flights.filter((f) => f.status === 'aborted').length}
              </span>
            </p>
          </div>
        </div>

        {/* Активные */}
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-slate-400 text-sm">Активных сейчас</p>
            <p className="mt-1 text-2xl font-semibold text-sky-300">
              {activeCount}
            </p>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Полёты со статусом «Выполняется».
          </p>
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-50">
            {statusFilter === 'all' ? 'Все полёты' : 'Отфильтрованные полёты'}
          </h2>
          <span className="text-xs text-slate-400">
            Показано: {filteredFlights.length}
          </span>
        </div>

        {filteredFlights.length === 0 ? (
          <p className="text-slate-400 text-sm">
            Нет полётов, подходящих под выбранные фильтры.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-400 border-b border-slate-700/70">
                  <th className="py-2 pr-4 text-left">Дрон</th>
                  <th className="py-2 px-4 text-left">Станция</th>
                  <th className="py-2 px-4 text-left">Время</th>
                  <th className="py-2 px-4 text-left">Статус</th>
                  <th className="py-2 px-4 text-right">Дистанция</th>
                  <th className="py-2 pl-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredFlights.map((flight) => (
                  <tr key={flight.id} className="hover:bg-slate-800/60">
                    {/* Дрон */}
                    <td className="py-3 pr-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-100">
                          {flight.droneName}
                        </span>
                        <span className="text-xs text-slate-400">
                          Код: {flight.droneId}
                        </span>
                      </div>
                    </td>

                    {/* Станция */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-slate-100">
                          {flight.stationName}
                        </span>
                        <span className="text-xs text-slate-400">
                          ID: {flight.stationId}
                        </span>
                      </div>
                    </td>

                    {/* Время */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col text-xs text-slate-300">
                        <span>c {formatDateTime(flight.startTime)}</span>
                        {flight.endTime && (
                          <span className="text-slate-400">
                            до {formatDateTime(flight.endTime)}
                          </span>
                        )}
                        {!flight.endTime && (
                          <span className="text-sky-300">ещё выполняется</span>
                        )}
                      </div>
                    </td>

                    {/* Статус */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                            getStatusBadgeClasses(flight.status),
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'h-1.5 w-1.5 rounded-full',
                              getStatusDotClasses(flight.status),
                            ].join(' ')}
                          />
                          {getStatusLabel(flight.status)}
                        </span>
                      </div>
                    </td>

                    {/* Дистанция */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-medium text-slate-100">
                        {formatDistance(flight.distanceKm)}
                      </span>
                    </td>

                    {/* Действия */}
                    <td className="py-3 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/drone/${flight.droneId}`)}
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
    </div>
  )
}

export default FlightsPage
