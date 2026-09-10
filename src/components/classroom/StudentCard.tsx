import { Trash2 } from 'lucide-react'

interface StudentCardProps {
  name: string
  email?: string
  onMessage?: () => void
  onRemove?: () => void
  removing?: boolean
}

export function StudentCard({ name, email, onMessage, onRemove, removing }: StudentCardProps) {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-classly-green flex items-center justify-center text-white font-semibold shrink-0">
          {name.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          {email && <p className="text-xs text-gray-500 truncate">{email}</p>}
        </div>
        {(onMessage ?? onRemove) && (
          <div className="flex items-center gap-2 shrink-0">
            {onMessage && (
              <button
                onClick={onMessage}
                className="px-3 py-1.5 text-xs font-medium text-classly-green hover:bg-green-50 rounded-lg transition-colors"
              >
                Message
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                disabled={removing}
                title="Remove student"
                className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}