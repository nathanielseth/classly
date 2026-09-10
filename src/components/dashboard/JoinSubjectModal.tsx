import { useState } from 'react'
import { AlertCircle } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface JoinSubjectModalProps {
  onClose: () => void
  onSubmit: (code: string) => Promise<unknown>
  submitting: boolean
  error: string | null
}

export function JoinSubjectModal({
  onClose,
  onSubmit,
  submitting,
  error,
}: JoinSubjectModalProps) {
  const [code, setCode] = useState('')

  const handleSubmit = () => {
    if (!code.trim() || submitting) return
    void onSubmit(code.trim())
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Join a Subject</DialogTitle>
            <DialogDescription>
              Enter the subject code from your instructor
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-6">
          <Input
            type="text"
            placeholder="e.g., CS101-A"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
            className="font-mono tracking-wider uppercase"
            autoFocus
            disabled={submitting}
          />
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!code.trim() || submitting}
          >
            {submitting ? 'Joining...' : 'Join'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}