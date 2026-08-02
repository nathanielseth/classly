import { useState } from 'react'
import { X, Loader2, BookOpen, AlertCircle } from 'lucide-react'

interface CreateTopicModalProps {
  mode: 'create' | 'edit'
  initial?: { name: string; description: string | null }
  onClose: () => void
  onSubmit: (values: { name: string; description: string }) => Promise<unknown>
  submitting: boolean
  error: string | null
}

export function CreateTopicModal({
  mode,
  initial,
  onClose,
  onSubmit,
  submitting,
  error,
}: CreateTopicModalProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  const canSubmit = name.trim().length > 0 && !submitting

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-classly-green" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'create' ? 'Create Topic' : 'Edit Topic'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={submitting}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topic Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
              placeholder="e.g., Week 1: Introduction, Midterm Review"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all resize-none"
              rows={3}
              placeholder="Brief description of what this topic covers..."
              disabled={submitting}
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">About Topics</p>
              <p>
                Topics help you organize materials into logical sections. You
                can assign materials to topics when creating or editing them.
              </p>
            </div>
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
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSubmit({ name: name.trim(), description: description.trim() })
            }
            disabled={!canSubmit}
            className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : mode === 'create' ? (
              'Create Topic'
            ) : (
              'Update Topic'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}