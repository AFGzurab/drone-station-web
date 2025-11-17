// src/modules/map/MapPage.tsx
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'

import { fetchStations, type Station } from '../../shared/api/stations'
import {
  fetchAllDrones,
  type Drone,
  type DroneStatus,
} from '../../shared/api/drones'

export default function MapPage() {
  const navigate = useNavigate()

  const [stations, setStations] = useState<Station[]>([])
  const [drones, setDrones] = useState<Drone[]>([])
  const [loading, setLoading] = useState(true)
  const [showDrones, setShowDrones] = useState(true)

  // центр карты (Новосибирск)
  const center: [number, number] = [55.03, 82.92]

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

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-slate-200">
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

  // Смещение маркера дрона ради красоты
  function getDroneCoords(drone: Drone): [number, number] {
    const base = getStationCoords(drone.stationId)

    const index = parseInt(drone.id.replace(/\D/g, ''), 10) || 0
    const angle = ((index % 8) * Math.PI) / 4

    const radius = 0.015 // расстояние ~600–700 м визуально

    const lat = base.lat + Math.sin(angle) * radius
    const lng = base.lng + Math.cos(angle) * radius
    return [lat, lng]
  }

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

  const activeDrones = drones.filter((d) =>
    ['on_mission', 'returning', 'error'].includes(d.status),
  )

  // -------------------------------------------------
  // JSX
  // -------------------------------------------------

  return (
    <div className="p-6">
      {/* Верхняя панель — заголовок, чекбокс и легенда */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        {/* Левая часть */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Карта станций</h1>
          <p className="text-sm text-slate-400">
            На карте отображаются дрон-станции и активные дроны.
          </p>
        </div>

        {/* Правая часть: чекбокс + легенда */}
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          {/* чекбокс */}
          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-600 bg-slate-800"
              checked={showDrones}
              onChange={(e) => setShowDrones(e.target.checked)}
            />
            Показывать активные дроны (на задании / возвращаются / с ошибкой)
          </label>

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

      {/* Карта */}
      <div className="h-[70vh] rounded-xl overflow-hidden border border-slate-800">
        <MapContainer
          center={center}
          zoom={11}
          scrollWheelZoom={true}
          className="w-full h-full"
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

          {/* ДРОНЫ */}
          {showDrones &&
            activeDrones.map((drone) => {
              const [lat, lng] = getDroneCoords(drone)
              const color = getDroneColor(drone.status)

              return (
                <CircleMarker
                  key={drone.id}
                  center={[lat, lng]}
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
                      <p className="text-xs text-slate-700">Код: {drone.code}</p>
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
                      <button
                        className="mt-2 w-full rounded-full bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-400"
                        onClick={() => navigate(`/drone/${drone.id}`)}
                      >
                        Открыть дрон
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
        </MapContainer>
      </div>
    </div>
  )
}
