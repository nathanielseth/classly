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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Material' : 'Edit Material'}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="material-title">Title *</Label>
            <Input
              id="material-title"
              type="text"
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
              placeholder="e.g., Week 1: Introduction to React"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="material-description">Description</Label>
            <Textarea
              id="material-description"
              value={values.description}
              onChange={(e) =>
                setValues({ ...values, description: e.target.value })
              }
              rows={3}
              placeholder="Brief description..."
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="material-instructions">Instructions</Label>
            <Textarea
              id="material-instructions"
              value={values.instructions}
              onChange={(e) =>
                setValues({ ...values, instructions: e.target.value })
              }
              rows={4}
              placeholder="Detailed instructions for students..."
              disabled={submitting}
            />
          </div>

          {topics.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="material-topic">
                Topic <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Select
                value={values.topicId || 'none'}
                onValueChange={(value) =>
                  setValues({
                    ...values,
                    topicId: value === 'none' ? '' : (value as string),
                  })
                }
                disabled={submitting}
              >
                <SelectTrigger id="material-topic" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Topic</SelectItem>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="material-type">Type</Label>
              <Select
                value={values.type}
                onValueChange={(value) =>
                  setValues({
                    ...values,
                    type: value as MaterialFormValues['type'],
                  })
                }
                disabled={submitting}
              >
                <SelectTrigger id="material-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type[0].toUpperCase()}
                      {type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="material-points">Points</Label>
              <Input
                id="material-points"
                type="number"
                value={values.maxPoints}
                onChange={(e) =>
                  setValues({
                    ...values,
                    maxPoints: parseInt(e.target.value, 10) || 0,
                  })
                }
                min="0"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="material-due-date">
              Due Date <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="material-due-date"
              type="datetime-local"
              value={values.dueDate}
              onChange={(e) =>
                setValues({ ...values, dueDate: e.target.value })
              }
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Attached File</Label>

            {hasExistingFile && !selectedFile && (
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Paperclip className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {existingFileName}
                    </p>
                    {existingFileSize !== null && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(existingFileSize)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setRemoveExistingFile(true)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    disabled={submitting}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}

            {selectedFile ? (
              <div className="rounded-lg border border-border bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  {!submitting && (
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary">
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
                  className="flex cursor-pointer flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {hasExistingFile
                        ? 'Replace file'
                        : 'Click to upload or drag and drop'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PDF, DOC, PPT, XLS, ZIP, Images (Max 10MB)
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={values.allowLateSubmission}
                onCheckedChange={(checked) =>
                  setValues({
                    ...values,
                    allowLateSubmission: checked === true,
                  })
                }
                disabled={submitting}
              />
              <span className="text-sm text-foreground">
                Allow late submissions
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={values.published}
                onCheckedChange={(checked) =>
                  setValues({ ...values, published: checked === true })
                }
                disabled={submitting}
              />
              <span className="text-sm text-foreground">
                Published (visible to students)
              </span>
            </label>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1"
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
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}