import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import {
  listSubjects,
  createSubject,
  setSubjectArchived,
  updateSubject,
  deleteSubject,
} from '@/lib/server/functions/subjects'
import { InstructorSubjectCard } from './InstructorSubjectCard'
import { CreateSubjectModal } from './CreateSubjectModal'
import { EditSubjectModal } from './EditSubjectModal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InlineMessage } from '@/components/ui/inline-message'

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

export function InstructorDashboardView() {
  const queryClient = useQueryClient()
  const [showArchived, setShowArchived] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'list', { includeArchived: showArchived }],
    queryFn: () => listSubjects({ data: { includeArchived: showArchived } }),
  })

  const createMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: async () => {
      setCreateError(null)
      setCreateModalOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['subjects', 'list'] })
    },
    onError: (error: Error) => setCreateError(error.message),
  })

  const archiveMutation = useMutation({
    mutationFn: setSubjectArchived,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects', 'list'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateSubject,
    onSuccess: async () => {
      setEditError(null)
      setEditingSubjectId(null)
      await queryClient.invalidateQueries({ queryKey: ['subjects', 'list'] })
    },
    onError: (error: Error) => setEditError(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects', 'list'] })
    },
  })

  const subjects = subjectsQuery.data?.subjects ?? []
  const visibleSubjects = showArchived
    ? subjects.filter((s) => s.archived)
    : subjects.filter((s) => !s.archived)
  const editingSubject = subjects.find((s) => s.id === editingSubjectId) ?? null

  const activeSubjects = subjects.filter((s) => !s.archived)
  const totalStudents = activeSubjects.reduce(
    (sum, s) => sum + s.enrollmentCount,
    0,
  )
  const totalMaterials = activeSubjects.reduce(
    (sum, s) => sum + s.materialCount,
    0,
  )
  const archivedCount = subjects.filter((s) => s.archived).length

  return (
    <div className="page space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {showArchived ? 'Archived subjects' : 'Your subjects'}
          </h1>
          {/* The summary carries the same numbers four icon tiles used to,
              as one sentence instead of a row of decoration. */}
          {!showArchived && !subjectsQuery.isPending && (
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {plural(activeSubjects.length, 'subject')} ·{' '}
              {plural(totalStudents, 'student')} ·{' '}
              {plural(totalMaterials, 'material')}
              {archivedCount > 0 && <> · {plural(archivedCount, 'archived')}</>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? 'secondary' : 'outline'}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? 'View active' : 'View archived'}
          </Button>
          {!showArchived && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus aria-hidden />
              Create subject
            </Button>
          )}
        </div>
      </div>

      {subjectsQuery.isError ? (
        <InlineMessage>
          Could not load your subjects. {subjectsQuery.error.message}
        </InlineMessage>
      ) : subjectsQuery.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : visibleSubjects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-input px-6 py-12">
          <h3 className="text-base font-semibold text-foreground">
            {showArchived ? 'No archived subjects' : 'No subjects yet'}
          </h3>
          {!showArchived && (
            <>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Create a subject to start posting materials and enrolling
                students.
              </p>
              <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                <Plus aria-hidden />
                Create subject
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleSubjects.map((subject) => (
            <InstructorSubjectCard
              key={subject.id}
              subject={subject}
              onToggleArchive={(subjectId, archived) =>
                archiveMutation.mutate({ data: { subjectId, archived } })
              }
              isToggling={archiveMutation.isPending}
              onEdit={() => {
                setEditError(null)
                setEditingSubjectId(subject.id)
              }}
              onDelete={() =>
                deleteMutation.mutateAsync({
                  data: { subjectId: subject.id },
                })
              }
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {createModalOpen && (
        <CreateSubjectModal
          onClose={() => {
            setCreateModalOpen(false)
            setCreateError(null)
          }}
          onSubmit={(values) => createMutation.mutateAsync({ data: values })}
          submitting={createMutation.isPending}
          error={createError}
        />
      )}

      {editingSubject && (
        <EditSubjectModal
          subject={editingSubject}
          onClose={() => {
            setEditingSubjectId(null)
            setEditError(null)
          }}
          onSubmit={(values) =>
            updateMutation.mutateAsync({
              data: { subjectId: editingSubject.id, ...values },
            })
          }
          submitting={updateMutation.isPending}
          error={editError}
        />
      )}
    </div>
  )
}
