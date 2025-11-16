// src/modules/stations/StationStatusBadge.tsx
import type { StationStatus } from '../../shared/api/stations'

type Props = {
  status: StationStatus
}

export function StationStatusBadge({ status }: Props) {
  const map: Record<StationStatus, { label: string; className: string }> = {
    online: {
      label: 'Online',
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
    },
    offline: {
      label: 'Offline',
      className: 'bg-slate-500/10 text-slate-300 border-slate-500/40',
    },
    error: {
      label: 'Ошибка',
      className: 'bg-red-500/10 text-red-300 border-red-500/40',
    },
  }

  const { label, className } = map[status]

  return (
    <span
      className={
        'inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ' +
        className
      }
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {label}
    </span>
  )
}