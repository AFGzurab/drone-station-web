// src/modules/drone/DronePage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  fetchDroneById,
  sendDroneCommand,
  type Drone,
  type DroneCommand,
} from "../../shared/api/drones";

export function DronePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [drone, setDrone] = useState<Drone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commandStatus, setCommandStatus] = useState<string | null>(null);
  const [commandLoading, setCommandLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setLoading(true);

    fetchDroneById(id)
      .then((d) => {
        if (!mounted) return;
        if (!d) setError("Дрон не найден");
        setDrone(d);
      })
      .catch(() => {
        if (mounted) setError("Ошибка загрузки данных дрона");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  // ------------------------------------------
  // Статус-бейдж дрона
  // ------------------------------------------
  function renderDroneStatusBadge() {
    if (!drone) return null;

    switch (drone.status) {
      case "idle":
        return (
          <span className="status-badge status-offline">● Ожидает задания</span>
        );
      case "on_mission":
        return (
          <span className="status-badge status-mission">● На задании</span>
        );
      case "returning":
        return (
          <span className="status-badge status-online">
            ● Возвращается на станцию
          </span>
        );
      case "error":
      default:
        return <span className="status-badge status-error">● Ошибка</span>;
    }
  }

  // ------------------------------------------
  // Отправка команд дрону
  // ------------------------------------------
  async function handleCommand(command: DroneCommand) {
    if (!drone) return;

    setCommandLoading(true);
    setCommandStatus(null);

    try {
      const res = await sendDroneCommand(drone.id, command);
      setCommandStatus(res.message);
    } catch {
      setCommandStatus("Ошибка выполнения команды (фейк)");
    } finally {
      setCommandLoading(false);
    }
  }

  // ------------------------------------------

  return (
    <div className="min-h-[calc(100vh-48px)] bg-slate-900 text-white page-container">
      <button
        onClick={() => navigate(-1)}
        className="text-xs text-slate-400 hover:text-sky-400 mb-3"
      >
        ← Назад
      </button>

      {loading && <p className="text-slate-400">Загрузка данных дрона...</p>}
      {error && <p className="text-rose-400">{error}</p>}
      {!loading && !error && drone && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* === ЛЕВАЯ ПАНЕЛЬ — информация о дроне === */}
          <div className="card lg:col-span-2">
            <h1>{drone.name}</h1>
            <p className="text-slate-400 mb-4">
              Код дрона: {drone.code} • Станция: {drone.stationId}
            </p>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3>Текущая миссия</h3>
                <p className="mt-1">{drone.mission}</p>
              </div>

              {/* Статус-бейдж */}
              <div>{renderDroneStatusBadge()}</div>
            </div>

            <div className="mb-4">
              <h3>Последний контакт</h3>
              <p className="mt-1">{drone.lastContact}</p>
            </div>

            <div>
              <h3 className="mb-2">Заряд аккумулятора</h3>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`
                      h-full 
                      ${drone.battery > 60 ? "bg-emerald-500" : ""}
                      ${
                        drone.battery <= 60 && drone.battery > 30
                          ? "bg-amber-400"
                          : ""
                      }
                      ${drone.battery <= 30 ? "bg-rose-500" : ""}
                    `}
                    style={{ width: `${drone.battery}%` }}
                  />
                </div>
                <span className="text-sm text-slate-200">{drone.battery}%</span>
              </div>
            </div>
          </div>

          {/* === ПРАВАЯ ПАНЕЛЬ — команды === */}
          <div className="card flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Команды дрону
              </h2>

              <div className="space-y-3">
                <button
                  onClick={() => handleCommand("send_on_mission")}
                  disabled={commandLoading}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition"
                >
                  Отправить на задание
                </button>

                <button
                  onClick={() => handleCommand("return_to_station")}
                  disabled={commandLoading}
                  className="w-full py-3 bg-slate-600 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition"
                >
                  Вернуть на станцию
                </button>

                <button
                  onClick={() => handleCommand("emergency_landing")}
                  disabled={commandLoading}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition"
                >
                  Экстренная посадка
                </button>
              </div>
            </div>

            <p
              className={`text-xs mt-3 min-h-[1.25rem] ${
                commandStatus ? "text-emerald-400" : "text-slate-400/70"
              }`}
            >
              {commandStatus || "Статус команды появится здесь."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
