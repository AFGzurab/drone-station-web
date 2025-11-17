// src/modules/map/MapPage.tsx
import { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
} from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'

import { fetchStations, type Station } from '../../shared/api/stations'
import {
  fetchAllDrones,
  type Drone,
  type DroneStatus,
} from '../../shared/api/drones'
import {
  subscribeToTelemetry,
  type DroneTelemetry,
  getMissionTarget,
} from '../../shared/api/telemetry'

type TelemetryHistory = Record<string, DroneTelemetry[]>

export default function MapPage() {
  const navigate = useNavigate()

  const [stations, setStations] = useState<Station[]>([])
  const [drones, setDrones] = useState<Drone[]>([])
  const [loading, setLoading] = useState(true)
  const [showDrones, setShowDrones] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)

  // история телеметрии: для каждого дрона храним последние N точек
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryHistory>({})

  // центр карты (Новосибирск)
  const center: [number, number] = [55.03, 82.92]

  // ---------------------------------------------
  // Загрузка станций + списка дронов (REST)
  // ---------------------------------------------
  useEffect(() => {
    async function load() {
      try {
        const [stationsData, dronesData] = await Promise.all([
          fetchStations(),
          fetchAllDrones(),
        ])
        setStations(stationsData)
        setDrones(dronesData)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  // ---------------------------------------------
  // Подписка на телеметрию всех дронов
  // ---------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribeToTelemetry((snapshot) => {
      setTelemetryHistory((prev) => {
        const next: TelemetryHistory = { ...prev }
        const MAX_POINTS = 30

        snapshot.forEach((t) => {
          const list = next[t.droneId] ?? []
          const updated = [...list, t].slice(-MAX_POINTS)
          next[t.droneId] = updated
        })

        return next
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center text-slate-200">
        Загрузка карты...
      </div>
    )
  }

  // -------------------------------------------------
  // Вспомогательные функции
  // -------------------------------------------------
  function getStationCoords(stationId: string): { lat: number; lng: number } {
    const st = stations.find((s) => s.id === stationId)
    return (
      st?.coords ?? {
        lat: center[0],
        lng: center[1],
      }
    )
  }

  // Смещение маркера дрона от станции — fallback,
  // если по нему ещё не пришла телеметрия
  function getFallbackDroneCoords(drone: Drone): [number, number] {
    const base = getStationCoords(drone.stationId)

    const index = parseInt(drone.id.replace(/\D/g, ''), 10) || 0
    const angle = ((index % 8) * Math.PI) / 4
    const radius = 0.015 // расстояние ~600–700 м визуально

    const lat = base.lat + Math.sin(angle) * radius
    const lng = base.lng + Math.cos(angle) * radius
    return [lat, lng]
  }

  // Цвет дрона по статусу
  function getDroneColor(status: DroneStatus): string {
    switch (status) {
      case 'on_mission':
        return '#eab308'
      case 'returning':
        return '#0ea5e9'
      case 'error':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  // Активные дроны, для которых имеет смысл показывать маркеры/маршруты
  const activeDrones = drones.filter((d) =>
    ['on_mission', 'returning', 'error'].includes(d.status),
  )

  // -------------------------------------------------
  // JSX
  // -------------------------------------------------

  return (
    // фиксированная зона под карту: без вертикального скролла страницы
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden px-6 pb-6 pt-4">
      {/* Верхняя панель — заголовок, чекбоксы и легенда */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4 shrink-0">
        {/* Левая часть */}
        <div>
          <h1 className="mb-1 text-2xl font-bold text-white">Карта станций</h1>
          <p className="text-sm text-slate-400">
            На карте отображаются дрон-станции и активные дроны.
          </p>
        </div>

        {/* Правая часть: чекбоксы + легенда */}
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="space-y-1">
            {/* чекбокс: показывать дронов */}
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                checked={showDrones}
                onChange={(e) => setShowDrones(e.target.checked)}
              />
              Активные дроны
              <span className="hidden sm:inline">
                
              </span>
            </label>

            {/* чекбокс: маршруты */}
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                checked={showRoutes}
                onChange={(e) => setShowRoutes(e.target.checked)}
              />
              Показывать маршруты дронов
            </label>
          </div>

          {/* легенда */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Станция online
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              Станция offline
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Станция с ошибкой
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              Дрон на задании
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
              Дрон возвращается
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Дрон с ошибкой
            </div>
          </div>
        </div>
      </div>

      {/* Карта — занимает всё оставшееся пространство без скролла */}
      <div className="flex-1 rounded-xl border border-slate-800 overflow-hidden min-h-0">
        <MapContainer
          center={center}
          zoom={11}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution=""
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* СТАНЦИИ */}
          {stations.map((station) => (
            <CircleMarker
              key={station.id}
              center={[station.coords.lat, station.coords.lng]}
              radius={14}
              pathOptions={{
                color:
                  station.status === 'online'
                    ? '#2dd4bf'
                    : station.status === 'error'
                    ? '#ef4444'
                    : '#64748b',
                fillColor:
                  station.status === 'online'
                    ? '#2dd4bf'
                    : station.status === 'error'
                    ? '#ef4444'
                    : '#64748b',
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <h3 className="font-semibold">{station.name}</h3>
                  <p className="text-xs text-slate-700">
                    Координаты: {station.coords.lat}, {station.coords.lng}
                  </p>
                  <p className="text-xs text-slate-700">
                    Дроны: {station.dronesActive} / {station.dronesTotal}
                  </p>
                  <p className="text-xs text-slate-700">
                    Средний заряд: {station.batteryAvg}%
                  </p>

                  <button
                    className="mt-2 w-full rounded-full bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-400"
                    onClick={() => navigate(`/stations/${station.id}`)}
                  >
                    Открыть станцию
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* ДРОНЫ + МАРШРУТЫ */}
          {showDrones &&
            activeDrones.map((drone) => {
              const history = telemetryHistory[drone.id]
              const lastPoint =
                history && history.length > 0
                  ? history[history.length - 1]
                  : null

              // если есть телеметрия — берём её координаты,
              // иначе fallback к "окрестностям станции"
              const markerPos: [number, number] = lastPoint
                ? [lastPoint.lat, lastPoint.lng]
                : getFallbackDroneCoords(drone)

              const color = getDroneColor(drone.status)

              const stationBase = getStationCoords(drone.stationId)
              const missionTarget = getMissionTarget(drone.id)

              // считаем, долетел ли дрон до точки задания
              let arrivedToMission = false
              if (drone.status === 'on_mission' && lastPoint && missionTarget) {
                const dLat = lastPoint.lat - missionTarget.lat
                const dLng = lastPoint.lng - missionTarget.lng
                const dist = Math.sqrt(dLat * dLat + dLng * dLng)
                // порог ~150–200 м (в градусах ~0.0015)
                arrivedToMission = dist < 0.0015
              }

              let routePositions: [number, number][] = []

              if (history && history.length > 0) {
                if (drone.status === 'returning') {
                  // хвост от станции до дрона (синий)
                  routePositions = [
                    [stationBase.lat, stationBase.lng],
                    ...history.map(
                      (t) => [t.lat, t.lng] as [number, number],
                    ),
                  ]
                } else if (
                  drone.status === 'on_mission' &&
                  missionTarget &&
                  !arrivedToMission &&
                  lastPoint
                ) {
                  // вектор от текущего положения до цели (жёлтый)
                  routePositions = [
                    [lastPoint.lat, lastPoint.lng],
                    [missionTarget.lat, missionTarget.lng],
                  ]
                }
              }

              const showRouteForDrone =
                showRoutes &&
                (drone.status === 'returning' ||
                  (drone.status === 'on_mission' && !arrivedToMission))

              return (
                <div key={drone.id}>
                  {/* Маршрут */}
                  {showRouteForDrone && routePositions.length > 1 && (
                    <Polyline
                      positions={routePositions}
                      pathOptions={{
                        color,
                        weight: 5,
                        opacity: 0.9,
                      }}
                    />
                  )}

                  {/* Маркер дрона */}
                  <CircleMarker
                    center={markerPos}
                    radius={8}
                    pathOptions={{
                      color: '#020617',
                      weight: 1.5,
                      fillColor: color,
                      fillOpacity: 0.9,
                    }}
                  >
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <h3 className="font-semibold">{drone.name}</h3>
                        <p className="text-xs text-slate-700">
                          Код: {drone.code}
                        </p>
                        <p className="text-xs text-slate-700">
                          Статус:{' '}
                          {drone.status === 'on_mission'
                            ? 'На задании'
                            : drone.status === 'returning'
                            ? 'Возвращается на станцию'
                            : 'Ошибка'}
                        </p>
                        <p className="text-xs text-slate-700">
                          Миссия: {drone.mission}
                        </p>
                        <p className="text-xs text-slate-700">
                          Заряд: {drone.battery}%
                        </p>
                        {lastPoint && (
                          <p className="text-xs text-slate-700">
                            Координаты: {lastPoint.lat.toFixed(4)},{' '}
                            {lastPoint.lng.toFixed(4)}
                          </p>
                        )}
                        <button
                          className="mt-2 w-full rounded-full bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-400"
                          onClick={() => navigate(`/drone/${drone.id}`)}
                        >
                          Открыть дрон
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                </div>
              )
            })}
        </MapContainer>
      </div>
    </div>
  )
}
