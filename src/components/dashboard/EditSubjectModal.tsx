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

interface EditSubjectModalProps {
  subject: {
    name: string
    code: string
    description: string | null
    schedule: string | null
    room: string | null
  }
  onClose: () => void
  onSubmit: (values: {
    name: string
    code: string
    description: string
    schedule: string
    room: string
  }) => Promise<unknown>
  submitting: boolean
  error: string | null
}

export function EditSubjectModal({
  subject,
  onClose,
  onSubmit,
  submitting,
  error,
}: EditSubjectModalProps) {
  const [name, setName] = useState(subject.name)
  const [code, setCode] = useState(subject.code)
  const [description, setDescription] = useState(subject.description ?? '')
  const [schedule, setSchedule] = useState(subject.schedule ?? '')
  const [room, setRoom] = useState(subject.room ?? '')

  const canSubmit =
    name.trim().length > 0 && code.trim().length > 0 && !submitting

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="edit-subject-name">Subject Name</Label>
            <Input
              id="edit-subject-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-subject-code">Code</Label>
              <Input
                id="edit-subject-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-subject-room">Room</Label>
              <Input
                id="edit-subject-room"
                type="text"
                placeholder="Room 204"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-subject-schedule">Schedule</Label>
            <Input
              id="edit-subject-schedule"
              type="text"
              placeholder="e.g., MWF 10:00-11:30 AM"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-subject-description">Description</Label>
            <Textarea
              id="edit-subject-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
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
              onSubmit({
                name: name.trim(),
                code: code.trim(),
                description: description.trim(),
                schedule: schedule.trim(),
                room: room.trim(),
              })
            }
            disabled={!canSubmit}
            className="flex-1"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}