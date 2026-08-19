import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting) onClose()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'New Announcement' : 'Edit Announcement'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="announcement-title">
              Title{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="announcement-title"
              type="text"
              placeholder="e.g., Midterm rescheduled"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="announcement-content">Announcement</Label>
            <Textarea
              id="announcement-content"
              placeholder="Share something with the class..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              disabled={submitting}
            />
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
              onSubmit({ title: title.trim(), content: content.trim() })
            }
            disabled={!canSubmit}
            className="flex-1"
          >
            {submitting
              ? mode === 'create'
                ? 'Posting...'
                : 'Saving...'
              : mode === 'create'
                ? 'Post'
                : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}