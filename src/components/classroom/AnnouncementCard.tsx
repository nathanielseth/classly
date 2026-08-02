import { useState } from 'react'
import { MoreVertical, Pin, PinOff, Pencil, Trash2 } from 'lucide-react'

interface AnnouncementCardProps {
  announcement: {
    id: string
    title: string | null
    content: string
    pinned: boolean | null
    created_at: string | null
    updated_at: string | null
    author: { id: string; full_name: string; role: string } | null
  }
  canManage: boolean
  onTogglePin: (id: string, pinned: boolean) => void
  onEdit: (announcement: AnnouncementCardProps['announcement']) => void
  onDelete: (id: string) => void
  isMutating: boolean
}

function formatTimeAgo(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AnnouncementCard({
  announcement,
  canManage,
  onTogglePin,
  onEdit,
  onDelete,
  isMutating,
}: AnnouncementCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className={`bg-white border rounded-xl p-5 relative ${
        announcement.pinned
          ? 'border-classly-green/30 bg-green-50/30'
          : 'border-gray-200'
      }`}
    >
      {announcement.pinned && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-classly-green mb-3">
          <Pin size={12} className="fill-classly-green" />
          Pinned
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-classly-green/10 text-classly-green font-semibold text-sm flex items-center justify-center shrink-0">
          {announcement.author ? initials(announcement.author.full_name) : '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">
              {announcement.author?.full_name ?? 'Unknown'}
            </span>
            <span className="text-xs text-gray-400">
              {formatTimeAgo(announcement.created_at)}
            </span>
            {announcement.updated_at &&
              announcement.updated_at !== announcement.created_at && (
                <span className="text-xs text-gray-400 italic">(edited)</span>
              )}
          </div>

          {announcement.title && (
            <h3 className="font-semibold text-gray-900 mt-2">
              {announcement.title}
            </h3>
          )}
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
            {announcement.content}
          </p>
        </div>

        {canManage && (
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              disabled={isMutating}
              className="text-gray-300 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onTogglePin(announcement.id, !announcement.pinned)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    {announcement.pinned ? (
                      <PinOff size={14} />
                    ) : (
                      <Pin size={14} />
                    )}
                    {announcement.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onEdit(announcement)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete(announcement.id)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}