import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditSubjectModal } from '@/components/dashboard/EditSubjectModal'
import { updateSubject } from '@/lib/server/functions/subjects'

interface ClassroomSettingsButtonProps {
  subject: {
    id: string
    code: string
    name: string
    description: string | null
    schedule: string | null
    room: string | null
    meeting_url: string | null
  }
}

export function ClassroomSettingsButton({
  subject,
}: ClassroomSettingsButtonProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: updateSubject,
    onSuccess: async () => {
      setError(null)
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const close = () => {
    setOpen(false)
    setError(null)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings aria-hidden />
        Settings
      </Button>

      {open && (
        <EditSubjectModal
          subject={{ ...subject, meetingUrl: subject.meeting_url }}
          onClose={close}
          onSubmit={(values) =>
            mutation.mutateAsync({
              data: { subjectId: subject.id, ...values },
            })
          }
          submitting={mutation.isPending}
          error={error}
        />
      )}
    </>
  )
}