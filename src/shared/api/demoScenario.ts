// src/shared/api/demoScenario.ts
//
// Демонстрационный сценарий для защиты проекта.
// По нажатию кнопки в админке проигрываем цепочку действий:
// - запуск дронов на задание
// - возврат дронов
// - изменение статуса станции
// - системные события
//
// Работает поверх уже существующих мок-данных.

import { sendDroneCommand } from './drones'
import { updateStationStatus } from './stations'
import { logSystemEvent } from './events'
import { getSavedUser } from '../auth/auth'

type DemoStep = {
  delayMs: number
  run: () => void | Promise<void>
}

const DEMO_TOTAL_DURATION_MS = 30_000

let demoRunning = false

function getActorLabel() {
  const user = getSavedUser()
  if (!user) {
    return {
      label: 'admin',
      source: 'admin' as const,
    }
  }

  return {
    label: `${user.username} (${user.role})`,
    source: user.role as 'admin' | 'operator',
  }
}

/**
 * Запуск демо-сценария.
 * Повторный запуск во время работы сценария игнорируется.
 */
export function startDemoScenario() {
  if (demoRunning) {
    logSystemEvent({
      title: 'Демонстрационный сценарий уже запущен.',
      level: 'info',
      source: 'system',
    })
    return
  }

  demoRunning = true

  const { label, source } = getActorLabel()

  logSystemEvent({
    title: `Оператор ${label} запустил демонстрационный сценарий работы станции.`,
    level: 'info',
    source,
  })

  const steps: DemoStep[] = [
    {
      // Чуть "подготовим" станции
      delayMs: 500,
      run: () => {
        updateStationStatus('st-1', 'online')
        updateStationStatus('st-2', 'online')
      },
    },
    {
      // Запускаем DR-101 на задание
      delayMs: 1500,
      run: () => {
        void sendDroneCommand('dr-101', 'send_on_mission')
      },
    },
    {
      // Затем DR-102
      delayMs: 2500,
      run: () => {
        void sendDroneCommand('dr-102', 'send_on_mission')
      },
    },
    {
      // DR-101 возвращается
      delayMs: 3000,
      run: () => {
        void sendDroneCommand('dr-101', 'return_to_station')
      },
    },
    {
      // DR-102 тоже возвращается
      delayMs: 3000,
      run: () => {
        void sendDroneCommand('dr-102', 'return_to_station')
      },
    },
    {
      // На станции №3 появляется ошибка
      delayMs: 3000,
      run: () => {
        updateStationStatus('st-3', 'error')
      },
    },
    {
      // И "починили" станцию №3
      delayMs: 3000,
      run: () => {
        updateStationStatus('st-3', 'online')
        logSystemEvent({
          title:
            'Демонстрационный сценарий завершён. Система вернулась в обычный режим работы.',
          level: 'info',
          source: 'system',
        })
      },
    },
  ]

  let totalDelay = 0

  steps.forEach((step, index) => {
    totalDelay += step.delayMs

    window.setTimeout(async () => {
      try {
        await step.run()
      } finally {
        if (index === steps.length - 1) {
          demoRunning = false
        }
      }
    }, totalDelay)
  })

  // Перестраховка — по истечении общего времени точно сбрасываем флаг
  window.setTimeout(() => {
    demoRunning = false
  }, DEMO_TOTAL_DURATION_MS + 2000)
}

/**
 * Можно использовать, если захочешь где-то показывать статус сценария.
 */
export function isDemoScenarioRunning() {
  return demoRunning
}
