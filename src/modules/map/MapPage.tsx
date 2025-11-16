// src/modules/map/MapPage.tsx
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";

import { fetchStations } from "../../shared/api/stations";
import type { Station } from "../../shared/api/stations";
import { useEffect, useState } from "react";

export default function MapPage() {
  const navigate = useNavigate();

  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchStations();
        setStations(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Центр карты (Новосибирск)
  const center: [number, number] = [55.03, 82.92];

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-white">
        Загрузка карты...
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-1">Карта станций</h1>
      <p className="text-sm text-slate-400 mb-4">
        На карте отображаются дрон-станции и их статус.
      </p>

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

          {stations.map((station) => {
            const { lat, lng } = station.coords;

            return (
              <CircleMarker
                key={station.id}
                center={[lat, lng]}
                radius={14}
                pathOptions={{
                  color:
                    station.status === "online"
                      ? "#2dd4bf"
                      : station.status === "error"
                      ? "#ef4444"
                      : "#64748b",
                  fillColor:
                    station.status === "online"
                      ? "#2dd4bf"
                      : station.status === "error"
                      ? "#ef4444"
                      : "#64748b",
                  fillOpacity: 0.8,
                }}
              >
                <Popup className="popup-station">
                  <div className="space-y-1 text-sm">
                    <h3 className="font-semibold">{station.name}</h3>

                    <p className="text-xs text-slate-700">
                      Координаты: {lat}, {lng}
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
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
