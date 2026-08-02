import { MaterialForm } from './MaterialForm'
import type { MaterialFormValues } from './MaterialForm'

interface EditMaterialModalProps {
  topics: { id: string; name: string }[]
  initial: MaterialFormValues & {
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

export function EditMaterialModal({
  topics,
  initial,
  onClose,
  onSubmit,
  submitting,
  error,
}: EditMaterialModalProps) {
  return (
    <MaterialForm
      mode="edit"
      topics={topics}
      initial={initial}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={submitting}
      error={error}
    />
  )
}