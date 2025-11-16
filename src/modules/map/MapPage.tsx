// @ts-nocheck
// src/modules/map/MapPage.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { fetchStations } from '../../shared/api/stations'

export function MapPage() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // центр карты — Новосибирск
  const center = [55.03, 82.92]

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

  return (
    <div className="min-h-[calc(100vh-48px)] bg-slate-900 text-white px-6 py-4">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Карта станций</h1>
        <p className="text-sm text-slate-400">
          На карте отображаются дрон-станции и их статус.
        </p>
      </div>

      <div className="h-[70vh] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
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

          {!loading &&
            stations.map((st) => (
              <CircleMarker
                key={st.id}
                center={[st.lat, st.lng]}
                radius={10}
                pathOptions={{
                  color:
                    st.status === 'online'
                      ? '#22c55e'
                      : st.status === 'offline'
                      ? '#64748b'
                      : '#ef4444',
                  fillColor:
                    st.status === 'online'
                      ? '#22c55e'
                      : st.status === 'offline'
                      ? '#64748b'
                      : '#ef4444',
                  fillOpacity: 0.8,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold mb-1">{st.name}</div>
                    <div className="text-xs text-slate-500 mb-1">
                      {st.location}
                    </div>
                    <div className="text-xs mb-2">
                      Дроны: {st.dronesActive} / {st.dronesTotal}
                    </div>
                    <button
                      className="text-xs px-2 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white"
                      onClick={() => navigate(`/stations/${st.id}`)}
                    >
                      Открыть станцию
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
        </MapContainer>
      </div>
    </div>
  )
}