import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, Users, FileText, Archive } from 'lucide-react'
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
import { Card } from '@/components/ui/card'

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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {showArchived ? 'Archived Subjects' : 'Your Subjects'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your classes and materials
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? 'secondary' : 'outline'}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? 'View Active' : 'View Archived'}
          </Button>
          {!showArchived && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus size={18} strokeWidth={2.5} />
              Create Subject
            </Button>
          )}
        </div>
      </div>

      {!showArchived && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            icon={BookOpen}
            label="Active subjects"
            value={activeSubjects.length}
          />
          <StatTile icon={Users} label="Students" value={totalStudents} />
          <StatTile icon={FileText} label="Materials" value={totalMaterials} />
          <StatTile
            icon={Archive}
            label="Archived"
            value={archivedCount}
            accent="muted"
          />
        </div>
      )}

      {subjectsQuery.isError ? (
        <Card className="border-destructive/20 bg-destructive/5 p-6">
          <h3 className="mb-1 font-semibold text-destructive">
            Failed to load subjects
          </h3>
          <p className="text-sm text-destructive/80">
            {subjectsQuery.error.message}
          </p>
        </Card>
      ) : subjectsQuery.isPending ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : visibleSubjects.length === 0 ? (
        <Card className="border-2 border-dashed p-12 text-center shadow-none">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <BookOpen size={28} className="text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {showArchived ? 'No archived subjects' : 'No subjects yet'}
          </h3>
          {!showArchived && (
            <>
              <p className="mx-auto mb-4 max-w-sm text-sm text-muted-foreground">
                Create your first subject to start managing classes and
                materials
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus size={18} strokeWidth={2.5} />
                Create Your First Subject
              </Button>
            </>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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

function StatTile({
  icon: Icon,
  label,
  value,
  accent = 'primary',
}: {
  icon: typeof BookOpen
  label: string
  value: number
  accent?: 'primary' | 'muted'
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div
        className={
          accent === 'muted'
            ? 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'
            : 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'
        }
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xl leading-tight font-bold text-foreground">
          {value}
        </p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  )
}