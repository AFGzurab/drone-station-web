// src/modules/drone/DronePage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  fetchDroneById,
  sendDroneCommand,
  type Drone,
  type DroneCommand,
  subscribeToDroneTelemetry,
} from "../../shared/api/drones";

import {
  fetchFlightsByDrone,
  type Flight,
  type FlightStatus,
} from "../../shared/api/flights";

import {
  fetchWeather,
  type WeatherInfo,
  type WeatherRiskLevel,
} from "../../shared/api/weather";

function getFlightStatusLabel(status: FlightStatus): string {
  switch (status) {
    case "planned":
      return "Запланирован";
    case "in_progress":
      return "Выполняется";
    case "completed":
      return "Завершён";
    case "aborted":
      return "Прерван";
    default:
      return status;
  }
}

function getFlightStatusBadgeClasses(status: FlightStatus): string {
  switch (status) {
    case "in_progress":
      return "bg-sky-500/15 text-sky-300";
    case "completed":
      return "bg-emerald-500/15 text-emerald-300";
    case "aborted":
      return "bg-rose-500/15 text-rose-300";
    case "planned":
    default:
      return "bg-slate-500/20 text-slate-200";
  }
}

// --- риск по погоде для карточки команд ---

function getRiskLabel(level: WeatherRiskLevel): string {
  switch (level) {
    case "ok":
      return "Условия нормальные";
    case "warning":
      return "Условия осложнены";
    case "no_fly":
      return "Нелётная погода";
    default:
      return level;
  }
}

function getRiskBadgeClass(level: WeatherRiskLevel): string {
  switch (level) {
    case "ok":
      return "bg-emerald-500/15 text-emerald-300";
    case "warning":
      return "bg-amber-500/15 text-amber-300";
    case "no_fly":
      return "bg-rose-500/20 text-rose-300";
    default:
      return "bg-slate-500/20 text-slate-200";
  }
}

export function DronePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [drone, setDrone] = useState<Drone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commandStatus, setCommandStatus] = useState<string | null>(null);
  const [commandLoading, setCommandLoading] = useState(false);

  // История полётов конкретного дрона
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightsLoading, setFlightsLoading] = useState(false);
  const [flightsError, setFlightsError] = useState<string | null>(null);

  // Погода для ограничения команд
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // ------------------------------------------
  // Загрузка данных дрона
  // ------------------------------------------
  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    fetchDroneById(id)
      .then((d) => {
        if (!mounted) return;
        if (!d) {
          setError("Дрон не найден");
        }
        setDrone(d ?? null);
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
  // Загрузка истории полётов для этого дрона
  // ------------------------------------------
  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setFlightsLoading(true);
    setFlightsError(null);

    fetchFlightsByDrone(id)
      .then((data) => {
        if (!mounted) return;
        setFlights(data);
      })
      .catch(() => {
        if (mounted)
          setFlightsError(
            "Не удалось загрузить историю полётов для этого дрона."
          );
      })
      .finally(() => {
        if (mounted) setFlightsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  // ------------------------------------------
  // Подписка на телеметрию дрона (эмуляция WebSocket)
  // ------------------------------------------
  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToDroneTelemetry(id, (updatedDrone) => {
      setDrone(updatedDrone);
    });

    return () => {
      unsubscribe();
    };
  }, [id]);

  // ------------------------------------------
  // Погода для ограничения команд
  // ------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      try {
        if (!cancelled) {
          setWeatherLoading(true);
          setWeatherError(null);
        }
        const data = await fetchWeather();
        if (!cancelled) {
          setWeather(data);
        }
      } catch {
        if (!cancelled) {
          setWeatherError("Не удалось загрузить данные погоды.");
        }
      } finally {
        if (!cancelled) {
          setWeatherLoading(false);
        }
      }
    }

    loadWeather();

    return () => {
      cancelled = true;
    };
  }, []);

  const isNoFly = weather?.riskLevel === "no_fly";
  const isWarning = weather?.riskLevel === "warning";

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
      case "offline":
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
          {/* === ЛЕВАЯ КОЛОНКА: дрон + история полётов === */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h1>{drone.name}</h1>
              <p className="text-slate-400 mb-4">
                Код дрона: {drone.code} • Станция: {drone.stationId}
              </p>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3>Текущая миссия</h3>
                  <p className="mt-1">{drone.mission}</p>
                </div>
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
                  <span className="text-sm text-slate-200">
                    {drone.battery}%
                  </span>
                </div>
              </div>
            </div>

            {/* История полётов */}
            <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Недавние полёты дрона</h2>
                <span className="text-xs text-slate-400">
                  Записей: {flights.length}
                </span>
              </div>

              {flightsLoading && (
                <p className="text-slate-300 text-sm">
                  Загрузка истории полётов...
                </p>
              )}

              {flightsError && !flightsLoading && (
                <p className="text-rose-400 text-sm">{flightsError}</p>
              )}

              {!flightsLoading && !flightsError && flights.length === 0 && (
                <p className="text-slate-400 text-sm">
                  Для этого дрона пока нет полётов.
                </p>
              )}

              {!flightsLoading && !flightsError && flights.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="table-auto w-full text-left text-xs md:text-sm">
                    <thead className="text-slate-300 border-b border-slate-700">
                      <tr>
                        <th className="py-2 pr-2">Станция</th>
                        <th className="py-2 pr-2">Время</th>
                        <th className="py-2 pr-2 text-center">Статус</th>
                        <th className="py-2 pl-2 text-right">Дистанция</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-200">
                      {flights.map((f) => (
                        <tr
                          key={f.id}
                          className="border-b border-slate-700/40 last:border-0"
                        >
                          <td className="py-2 pr-2">
                            <div className="font-medium">{f.stationName}</div>
                            <div className="text-slate-500 text-[11px]">
                              {f.stationId}
                            </div>
                          </td>
                          <td className="py-2 pr-2">
                            <div className="font-mono text-[11px] text-slate-300">
                              c {f.startTime}
                            </div>
                            {f.endTime && (
                              <div className="font-mono text-[11px] text-slate-500">
                                до {f.endTime}
                              </div>
                            )}
                          </td>
                          <td className="py-2 pr-2 text-center">
                            <span
                              className={
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] " +
                                getFlightStatusBadgeClasses(f.status)
                              }
                            >
                              {getFlightStatusLabel(f.status)}
                            </span>
                          </td>
                          <td className="py-2 pl-2 pr-1 text-right whitespace-nowrap text-[11px]">
                            {f.distanceKm.toFixed(1)} км
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Правая колонка: команды дрону — с учётом погоды */}
          <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-6 h-fit self-start">
            <h2 className="text-lg font-semibold mb-4">Команды дрону</h2>

            {/* Погодные условия */}
            <div className="mb-4">
              <p className="text-slate-400 text-sm mb-1">Погодные условия</p>
              {weatherLoading && (
                <p className="text-xs text-slate-300">
                  Загрузка данных о погоде...
                </p>
              )}
              {!weatherLoading && weatherError && (
                <p className="text-xs text-amber-300">
                  {weatherError} Команды доступны, решение принимает оператор.
                </p>
              )}
              {!weatherLoading && !weatherError && weather && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                  <span className="font-semibold">{weather.tempC}°C</span>
                  <span
                    className={
                      "px-2 py-0.5 rounded-full " +
                      getRiskBadgeClass(weather.riskLevel)
                    }
                  >
                    {getRiskLabel(weather.riskLevel)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleCommand("send_on_mission")}
                className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                // 🔴 блокируем при загрузке погоды и no_fly
                disabled={commandLoading || weatherLoading || isNoFly}
              >
                Отправить на задание
              </button>

              <button
                onClick={() => handleCommand("return_to_station")}
                className="w-full py-2 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={commandLoading}
              >
                Вернуть на станцию
              </button>

              <button
                onClick={() => handleCommand("emergency_landing")}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={commandLoading}
              >
                Экстренная посадка
              </button>
            </div>

            {/* Статус по погоде */}
            {weatherLoading && (
              <p className="mt-4 text-xs text-slate-400">
                Ожидаем данные погоды от метеосервиса. Запуск на задание временно
                заблокирован.
              </p>
            )}

            {!weatherLoading && isNoFly && (
              <p className="mt-4 text-xs text-rose-300">
                Нелётная погода. Запуск дрона на задание временно заблокирован
                по регламенту безопасности.
              </p>
            )}

            {!weatherLoading && !isNoFly && isWarning && (
              <p className="mt-4 text-xs text-amber-300">
                Погодные условия осложнены. Запуск разрешён, но требует
                повышенной осторожности.
              </p>
            )}

            {commandLoading && (
              <p className="mt-4 text-xs text-slate-300">
                Выполнение команды...
              </p>
            )}

            {commandStatus && !commandLoading && (
              <p className="mt-4 text-xs text-emerald-300">
                {commandStatus}
              </p>
            )}

            {!commandStatus && !commandLoading && (
              <p className="mt-4 text-xs text-slate-400/80">
                Статус команды появится здесь.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
