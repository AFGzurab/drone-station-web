// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.tsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App

// function App() {
//   return (
//     <div className="min-h-screen flex items-center justify-center bg-slate-900">
//       <h1 className="text-3xl font-bold text-sky-400">
//         Drone Station Web
//       </h1>
//     </div>
//   )
// }

// export default App


import { Routes, Route, Link } from 'react-router-dom'
import { AuthPage } from './modules/auth/AuthPage'
import StationsListPage from './modules/stations/StationsListPage'
import StationDetailsPage from './modules/stations/StationDetailsPage'
import MapPage from "./modules/map/MapPage";
import AdminPage from './modules/admin/AdminPage'
import FlightsPage from './modules/flights/FlightsPage'
import { DronePage } from './modules/drone/DronePage'
import { ProtectedRoute } from './shared/auth/ProtectedRoute'
import { useAuth } from './shared/auth/AuthContext'

function App() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Верхняя панель */}
      <header className="border-b border-slate-800 px-6 py-3 flex gap-4 items-center justify-between">
        <span className="font-semibold text-sky-400">
          Станционный Паук
        </span>

        <nav className="flex gap-3 text-sm items-center">
          {!user && (
            <Link to="/login" className="hover:text-sky-300">
              Вход
            </Link>
          )}

          {user && (
            <>
              <Link to="/stations" className="hover:text-sky-300">
                Станции
              </Link>
              <Link to="/map" className="hover:text-sky-300">
                Карта
              </Link>
              <Link to="/flights">Полёты</Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="hover:text-sky-300">
                  Админка
                </Link>
              )}

              <span className="text-xs text-slate-400 mx-2">
                {user.username} ({user.role})
              </span>

              <button
                onClick={logout}
                className="text-xs px-2 py-1 border border-slate-600 rounded-lg hover:border-sky-400"
              >
                Выйти
              </button>
            </>
          )}
        </nav>
      </header>

      {/* Маршруты */}
      <main>
        <Routes>
          {/* Логин без защиты */}
          <Route path="/login" element={<AuthPage />} />

          {/* Список станций */}
          <Route
            path="/stations"
            element={
              <ProtectedRoute>
                <StationsListPage />
              </ProtectedRoute>
            }
          />

          {/* Детали станции */}
          <Route
            path="/stations/:id"
            element={
              <ProtectedRoute>
                <StationDetailsPage />
              </ProtectedRoute>
            }
          />

          {/* Карта */}
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapPage />
              </ProtectedRoute>
            }
          />

          {/* Админка только для admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminPage />
              </ProtectedRoute>
            }
          />

          <Route path="/flights" element={<FlightsPage />} />

          {/* Страница дрона */}
          <Route
            path="/drone/:id"
            element={
              <ProtectedRoute>
                <DronePage />
              </ProtectedRoute>
            }
          />

          {/* Дефолт — тоже защищён, кидаем на станции */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <StationsListPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App