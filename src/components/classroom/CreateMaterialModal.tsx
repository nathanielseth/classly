import { MaterialForm } from './MaterialForm'
import type { MaterialFormValues } from './MaterialForm'

interface CreateMaterialModalProps {
  topics: { id: string; name: string }[]
  onClose: () => void
  onSubmit: (
    values: MaterialFormValues,
    fileAction: { file: File | null; removeExisting: boolean },
  ) => Promise<unknown>
  submitting: boolean
  error: string | null
}

export function CreateMaterialModal({
  topics,
  onClose,
  onSubmit,
  submitting,
  error,
}: CreateMaterialModalProps) {
  return (
    <MaterialForm
      mode="create"
      topics={topics}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={submitting}
      error={error}
    />
  )
}