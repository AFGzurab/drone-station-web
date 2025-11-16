// src/modules/admin/AdminPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStations, type Station } from '../../shared/api/stations'

type SystemLog = {
  id: number
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  actor: string
}

const MOCK_LOGS: SystemLog[] = [
  {
    id: 1,
    timestamp: '2025-11-16 21:05',
    level: 'info',
    message: 'Оператор operator запустил дрона со станции №1',
    actor: 'operator',
  },
  {
    id: 2,
    timestamp: '2025-11-16 20:48',
    level: 'warning',
    message: 'Низкий средний заряд на станции №3 (34%)',
    actor: 'system',
  },
  {
    id: 3,
    timestamp: '2025-11-16 20:12',
    level: 'error',
    message: 'Станция №3 перешла в статус "Ошибка"',
    actor: 'system',
  },
  {
    id: 4,
    timestamp: '2025-11-16 19:40',
    level: 'info',
    message: 'Админ admin изменил параметры станции №2',
    actor: 'admin',
  },
  {
    id: 5,
    timestamp: '2025-11-16 19:05',
    level: 'warning',
    message:
      'Потеряна связь с дроном DR-204 (станция №2), ожидается переподключение',
    actor: 'system',
  },
  {
    id: 6,
    timestamp: '2025-11-16 18:55',
    level: 'info',
    message: 'Станция №1 успешно завершила плановую самодиагностику',
    actor: 'system',
  },
  {
    id: 7,
    timestamp: '2025-11-16 18:20',
    level: 'error',
    message: 'Ошибка обновления ПО станции №3, требуется вмешательство оператора',
    actor: 'system',
  },
]

export function AdminPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchStations()
      .then((data) => {
        if (mounted) setStations(data)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const stats = useMemo(() => {
    const total = stations.length
    const online = stations.filter((s) => s.status === 'online').length
    const offline = stations.filter((s) => s.status === 'offline').length
    const error = stations.filter((s) => s.status === 'error').length
    const avgBattery =
      stations.length > 0
        ? Math.round(
            stations.reduce((sum, s) => sum + s.batteryLevel, 0) /
              stations.length,
          )
        : 0

    return { total, online, offline, error, avgBattery }
  }, [stations])

  return (
    <div className="min-h-[calc(100vh-48px)] bg-slate-900 text-white px-6 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Админ-панель</h1>
          <p className="text-sm text-slate-400">
            Управление станциями, мониторинг состояния и системные события.
          </p>
        </div>
      </div>

      {/* Верхние карточки-статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/80 rounded-2xl px-4 py-3 border border-slate-700/60">
          <div className="text-xs text-slate-400 mb-1">Всего станций</div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </div>

        <div className="bg-slate-800/80 rounded-2xl px-4 py-3 border border-slate-700/60">
          <div className="text-xs text-slate-400 mb-1">Online</div>
          <div className="text-2xl font-semibold text-emerald-400">
            {stats.online}
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-2xl px-4 py-3 border border-slate-700/60">
          <div className="text-xs text-slate-400 mb-1">Проблемные станции</div>
          <div className="text-2xl font-semibold">
            {stats.offline + stats.error}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Offline:{' '}
            <span className="text-slate-200 mr-3">{stats.offline}</span>
            Ошибка: <span className="text-rose-400">{stats.error}</span>
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-2xl px-4 py-3 border border-slate-700/60">
          <div className="text-xs text-slate-400 mb-1">
            Средний заряд станций
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-semibold">{stats.avgBattery}%</div>
            <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-sky-500"
                style={{ width: `${stats.avgBattery}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Нижние блоки: станции + логи */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Таблица станций */}
        <div className="lg:col-span-2 bg-slate-800/80 rounded-2xl border border-slate-700/60">
          <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Станции</div>
              <div className="text-xs text-slate-400">
                Сводка по всем дрон-станциям.
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/90 text-xs text-slate-400">
                <tr>
                  <th className="text-left px-4 py-2">Станция</th>
                  <th className="text-left px-4 py-2">Статус</th>
                  <th className="text-left px-4 py-2">Дроны</th>
                  <th className="text-left px-4 py-2">Заряд</th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  stations.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/stations/${s.id}`)}
                      className="border-t border-slate-700/60 hover:bg-slate-800/60 cursor-pointer"
                    >
                      <td className="px-4 py-2">
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-slate-400">
                          {s.location}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {s.status === 'online' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/40">
                            ● Online
                          </span>
                        )}
                        {s.status === 'offline' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-300 text-xs border border-slate-500/40">
                            ● Offline
                          </span>
                        )}
                        {s.status === 'error' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs border border-rose-500/40">
                            ● Ошибка
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {s.dronesActive} / {s.dronesTotal}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                            <div
                              className="h-full bg-sky-500"
                              style={{ width: `${s.batteryLevel}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-300 w-10 text-right">
                            {s.batteryLevel}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                {loading && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-center text-xs text-slate-400"
                    >
                      Загрузка данных...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Логи системы */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60">
          <div className="px-4 py-3 border-b border-slate-700/60">
            <div className="text-sm font-medium">Системные события</div>
            <div className="text-xs text-slate-400">
              Последние операции и уведомления.
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto px-3 py-2 space-y-2 text-xs">
            {MOCK_LOGS.map((log) => (
              <div
                key={log.id}
                className="rounded-xl px-3 py-2 bg-slate-900/80 border border-slate-700/60"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-400">
                    {log.timestamp}
                  </span>
                  <span
                    className={
                      log.level === 'info'
                        ? 'text-[11px] text-sky-400'
                        : log.level === 'warning'
                        ? 'text-[11px] text-amber-300'
                        : 'text-[11px] text-rose-400'
                    }
                  >
                    {log.level.toUpperCase()}
                  </span>
                </div>
                <div className="mb-1">{log.message}</div>
                <div className="text-[11px] text-slate-500">
                  Источник: {log.actor}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}