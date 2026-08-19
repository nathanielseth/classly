import { useState } from 'react'
import {
  X,
  Loader2,
  Upload,
  Paperclip,
  FileText,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { toast } from '@/components/ui/toast'

const MATERIAL_TYPES = [
  'assignment',
  'quiz',
  'exam',
  'project',
  'module',
  'material',
  'others',
] as const

export interface MaterialFormValues {
  title: string
  description: string
  instructions: string
  dueDate: string
  maxPoints: number
  type: (typeof MATERIAL_TYPES)[number]
  topicId: string
  allowLateSubmission: boolean
  published: boolean
}

interface MaterialFormProps {
  mode: 'create' | 'edit'
  topics: { id: string; name: string }[]
  initial?: MaterialFormValues & {
    fileName: string | null
    fileSize: number | null
  }
  onClose: () => void
  onSubmit: (
    values: MaterialFormValues,
    fileAction: { file: File | null; removeExisting: boolean },
  ) => Promise<unknown>
  submitting: boolean
  error: string | null
}

function toDatetimeLocal(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

const EMPTY_VALUES: MaterialFormValues = {
  title: '',
  description: '',
  instructions: '',
  dueDate: '',
  maxPoints: 100,
  type: 'assignment',
  topicId: '',
  allowLateSubmission: true,
  published: true,
}

export function MaterialForm({
  mode,
  topics,
  initial,
  onClose,
  onSubmit,
  submitting,
  error,
}: MaterialFormProps) {
  const [values, setValues] = useState<MaterialFormValues>(() =>
    initial
      ? { ...initial, dueDate: toDatetimeLocal(initial.dueDate) }
      : EMPTY_VALUES,
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [removeExistingFile, setRemoveExistingFile] = useState(false)

  const existingFileName = initial?.fileName ?? null
  const existingFileSize = initial?.fileSize ?? null
  const hasExistingFile = Boolean(existingFileName) && !removeExistingFile

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'warning',
        title: 'File too large',
        description: 'File size must be less than 10MB.',
      })
      return
    }
    setSelectedFile(file)
    setRemoveExistingFile(false)
  }

  const canSubmit = values.title.trim().length > 0 && !submitting

  const handleSubmit = () => {
    onSubmit(
      { ...values, title: values.title.trim() },
      { file: selectedFile, removeExisting: removeExistingFile },
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'create' ? 'Create New Material' : 'Edit Material'}
            </h2>
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
              Title *
            </label>
            <input
              type="text"
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
              placeholder="e.g., Week 1: Introduction to React"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={values.description}
              onChange={(e) =>
                setValues({ ...values, description: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all resize-none"
              rows={3}
              placeholder="Brief description..."
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              value={values.instructions}
              onChange={(e) =>
                setValues({ ...values, instructions: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all resize-none"
              rows={4}
              placeholder="Detailed instructions for students..."
              disabled={submitting}
            />
          </div>

          {topics.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic <span className="text-gray-400">(Optional)</span>
              </label>
              <select
                value={values.topicId}
                onChange={(e) =>
                  setValues({ ...values, topicId: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
                disabled={submitting}
              >
                <option value="">No Topic</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={values.type}
                onChange={(e) =>
                  setValues({
                    ...values,
                    type: e.target.value as MaterialFormValues['type'],
                  })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
                disabled={submitting}
              >
                {MATERIAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type[0].toUpperCase()}
                    {type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points
              </label>
              <input
                type="number"
                value={values.maxPoints}
                onChange={(e) =>
                  setValues({
                    ...values,
                    maxPoints: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
                min="0"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="datetime-local"
              value={values.dueDate}
              onChange={(e) =>
                setValues({ ...values, dueDate: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attached File
            </label>

            {hasExistingFile && !selectedFile && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Paperclip className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {existingFileName}
                    </p>
                    {existingFileSize !== null && (
                      <p className="text-xs text-gray-500">
                        {formatFileSize(existingFileSize)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setRemoveExistingFile(true)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={submitting}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}

            {selectedFile ? (
              <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  {!submitting && (
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-classly-green transition-colors">
                <input
                  type="file"
                  id="material-file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={submitting}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="material-file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {hasExistingFile
                        ? 'Replace file'
                        : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOC, PPT, XLS, ZIP, Images (Max 10MB)
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={values.allowLateSubmission}
                onChange={(e) =>
                  setValues({
                    ...values,
                    allowLateSubmission: e.target.checked,
                  })
                }
                className="w-4 h-4 text-classly-green border-gray-300 rounded focus:ring-classly-green"
                disabled={submitting}
              />
              <span className="text-sm text-gray-700">
                Allow late submissions
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={values.published}
                onChange={(e) =>
                  setValues({ ...values, published: e.target.checked })
                }
                className="w-4 h-4 text-classly-green border-gray-300 rounded focus:ring-classly-green"
                disabled={submitting}
              />
              <span className="text-sm text-gray-700">
                Published (visible to students)
              </span>
            </label>
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
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Saving...'}
              </>
            ) : mode === 'create' ? (
              'Create Material'
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}