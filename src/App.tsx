import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

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
import { StationsListPage } from './modules/stations/StationsListPage'
import { MapPage } from './modules/map/MapPage'
import { AdminPage } from './modules/admin/AdminPage'
import { DronePage } from './modules/drone/DronePage'

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Простейший верхний бар навигации */}
      <header className="border-b border-slate-800 px-6 py-3 flex gap-4 items-center">
        <span className="font-semibold text-sky-400">
          Drone Station Web
        </span>

        <nav className="flex gap-3 text-sm">
          <Link to="/login" className="hover:text-sky-300">
            Вход
          </Link>
          <Link to="/stations" className="hover:text-sky-300">
            Станции
          </Link>
          <Link to="/map" className="hover:text-sky-300">
            Карта
          </Link>
          <Link to="/admin" className="hover:text-sky-300">
            Админка
          </Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/stations" element={<StationsListPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/drone/:id" element={<DronePage />} />
          {/* можно сделать дефолтный маршрут */}
          <Route path="*" element={<StationsListPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App