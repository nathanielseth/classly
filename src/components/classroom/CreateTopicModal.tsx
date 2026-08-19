import { useState } from 'react'
import { AlertCircle, BookOpen } from 'lucide-react'
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting) onClose()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>
              {mode === 'create' ? 'Create Topic' : 'Edit Topic'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="topic-name">Topic Name *</Label>
            <Input
              id="topic-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Week 1: Introduction, Midterm Review"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="topic-description">
              Description{' '}
              <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="topic-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of what this topic covers..."
              disabled={submitting}
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-xs text-foreground/80">
              <p className="mb-1 font-medium">About Topics</p>
              <p>
                Topics help you organize materials into logical sections. You
                can assign materials to topics when creating or editing them.
              </p>
            </div>
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
            onClick={() =>
              onSubmit({ name: name.trim(), description: description.trim() })
            }
            disabled={!canSubmit}
            className="flex-1"
          >
            {submitting
              ? mode === 'create'
                ? 'Creating...'
                : 'Updating...'
              : mode === 'create'
                ? 'Create Topic'
                : 'Update Topic'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}