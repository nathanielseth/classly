import { useState } from 'react'
import { AlertCircle, X } from 'lucide-react'

interface AnnouncementModalProps {
  mode: 'create' | 'edit'
  initial?: { title: string | null; content: string }
  onClose: () => void
  onSubmit: (values: { title: string; content: string }) => Promise<unknown>
  submitting: boolean
  error: string | null
}

export function AnnouncementModal({
  mode,
  initial,
  onClose,
  onSubmit,
  submitting,
  error,
}: AnnouncementModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')

  const canSubmit = content.trim().length > 0 && !submitting

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'New Announcement' : 'Edit Announcement'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Midterm rescheduled"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
              autoFocus
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Announcement
            </label>
            <textarea
              placeholder="Share something with the class..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all resize-none"
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSubmit({ title: title.trim(), content: content.trim() })
            }
            disabled={!canSubmit}
            className="flex-1 py-2.5 bg-classly-green text-white font-medium rounded-lg hover:bg-classly-green/90 transition-colors disabled:opacity-50"
          >
            {submitting
              ? mode === 'create'
                ? 'Posting...'
                : 'Saving...'
              : mode === 'create'
                ? 'Post'
                : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}