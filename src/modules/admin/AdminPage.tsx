// src/modules/admin/AdminPage.tsx

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStations, type Station } from '../../shared/api/stations'

type SystemEventLevel = 'info' | 'warning' | 'error'

type SystemEvent = {
  id: number
  time: string
  title: string
  source: string
  level: SystemEventLevel
}

// Побольше событий для «массовки»
const SYSTEM_EVENTS: SystemEvent[] = [
  {
    id: 1,
    time: '2025-11-16 21:05',
    title: 'Оператор operator запустил дрона со станции №1',
    source: 'operator',
    level: 'info',
  },
  {
    id: 2,
    time: '2025-11-16 20:48',
    title: 'Низкий средний заряд на станции №3 (34%)',
    source: 'system',
    level: 'warning',
  },
  {
    id: 3,
    time: '2025-11-16 20:12',
    title: 'Станция №3 перешла в статус "Ошибка"',
    source: 'system',
    level: 'error',
  },
  {
    id: 4,
    time: '2025-11-16 19:55',
    title: 'Дрон DR-101 успешно завершил задание и вернулся на станцию №1',
    source: 'system',
    level: 'info',
  },
  {
    id: 5,
    time: '2025-11-16 19:40',
    title: 'Оператор admin изменил режим работы станции №2',
    source: 'admin',
    level: 'info',
  },
  {
    id: 6,
    time: '2025-11-16 19:10',
    title: 'Дрон DR-301: длительное отсутствие телеметрии (более 5 минут)',
    source: 'monitoring',
    level: 'warning',
  },
  {
    id: 7,
    time: '2025-11-16 18:58',
    title: 'Станция №2 перешла в статус Offline',
    source: 'system',
    level: 'warning',
  },
  {
    id: 8,
    time: '2025-11-16 18:30',
    title: 'Заряд дрона DR-102 опустился ниже 15% во время задания',
    source: 'monitoring',
    level: 'error',
  },
  {
    id: 9,
    time: '2025-11-16 18:05',
    title: 'Оператор operator отменил задание для дрона DR-201',
    source: 'operator',
    level: 'info',
  },
  {
    id: 10,
    time: '2025-11-16 17:42',
    title: 'Станция №1: успешная калибровка навигационных модулей',
    source: 'service',
    level: 'info',
  },
  {
    id: 11,
    time: '2025-11-16 17:15',
    title: 'Массовая перезагрузка дронов на станции №3',
    source: 'admin',
    level: 'warning',
  },
  {
    id: 12,
    time: '2025-11-16 16:50',
    title: 'Неудачная попытка авторизации под пользователем operator',
    source: 'security',
    level: 'warning',
  },
]

export default function AdminPage() {
  const navigate = useNavigate()
  const [stations, setStations] = useState<Station[]>([])
  // Подсчёт количества станций по статусам
  const onlineCount = stations.filter((s) => s.status === 'online').length
  const errorCount = stations.filter((s) => s.status === 'error').length
  const offlineCount = stations.filter((s) => s.status === 'offline').length
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const stats = useMemo(() => {
    const total = stations.length
    const online = stations.filter((s) => s.status === 'online').length
    const problem = stations.filter((s) => s.status !== 'online').length

    const avgBattery =
      stations.length > 0
        ? Math.round(
            stations.reduce((sum, s) => sum + (s.batteryAvg ?? 0), 0) /
              stations.length,
          )
        : 0

    return { total, online, problem, avgBattery }
  }, [stations])

  const onlinePercent =
    stats.total > 0 ? Math.round((onlineCount / stats.total) * 100) : 0

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-slate-300">Загрузка панели администратора...</p>
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
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Всего станций</p>
          <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
        </div>

        {/* Карточка "Статус станций" */}
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

            {/* Полоска процента online */}
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${onlinePercent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {onlinePercent}% станций в сети
              </p>
            </div>
          </div>

          {/* Разбивка по статусам */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300">
              Online: {onlineCount}
            </span>
            <span className="px-2 py-1 rounded-full bg-slate-500/15 text-slate-200">
              Offline: {offlineCount}
            </span>
            <span className="px-2 py-1 rounded-full bg-rose-500/15 text-rose-300">
              Ошибка: {errorCount}
            </span>
          </div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-5">
          <p className="text-slate-400 text-sm">Средний заряд станций</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-sky-500"
                style={{ width: `${stats.avgBattery}%` }}
              />
            </div>
            <span className="text-xl font-semibold">{stats.avgBattery}%</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        {/* Таблица станций */}
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6">
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
                      {s.status === 'online' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-600/20 text-emerald-300 text-xs">
                          ● Online
                        </span>
                      )}
                      {s.status === 'offline' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-500/20 text-slate-300 text-xs">
                          ● Offline
                        </span>
                      )}
                      {s.status === 'error' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-600/20 text-rose-300 text-xs">
                          ● Ошибка
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-center">
                      {s.dronesActive} / {s.dronesTotal}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-32 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500"
                            style={{
                              width: `${s.batteryAvg ?? s.batteryLevel ?? 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-slate-300 text-sm">
                          {s.batteryAvg ?? s.batteryLevel ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 pr-3 text-right">
                      <button
                        onClick={() => navigate(`/stations/${s.id}`)}
                        className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-sm rounded-xl text-white transition"
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

        {/* Системные события */}
        <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6 flex flex-col">
          <h2 className="text-lg font-semibold mb-1">Системные события</h2>
          <p className="text-slate-400 text-sm mb-4">
            Последние операции и уведомления.
          </p>

          {/* Список событий со скроллом под тёмную тему */}
<div className="space-y-2 overflow-y-auto pr-2 max-h-96 scroll-dark">
  {SYSTEM_EVENTS.map((ev) => (
    <div
      key={ev.id}
      className="rounded-xl bg-slate-900/50 border border-slate-800/70 px-4 py-2.5 text-sm flex flex-col gap-1 shadow-sm shadow-slate-950/40"
    >
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
      <p className="text-slate-100 leading-snug">{ev.title}</p>
      <p className="text-slate-500 text-[11px]">Источник: {ev.source}</p>
    </div>
  ))}
</div>
        </div>
      </div>
    </div>
  )
}
