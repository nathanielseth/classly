import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  BookOpen,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  FolderPlus,
} from 'lucide-react'
import {
  createMaterial,
  createTopic,
  deleteMaterial,
  deleteTopic,
  listMaterialsWithTopics,
  removeMaterialFile,
  updateMaterial,
  updateTopic,
  uploadMaterialFile,
} from '@/lib/server/functions/materials'
import { listOwnSubmissionStatuses } from '@/lib/server/functions/submissions'
import { MaterialCard } from './MaterialCard'
import { CreateMaterialModal } from './CreateMaterialModal'
import { EditMaterialModal } from './EditMaterialModal'
import { CreateTopicModal } from './CreateTopicModal'
import type { MaterialFormValues } from './MaterialForm'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

interface MaterialsTabProps {
  subjectId: string
  canManage: boolean
}

type MaterialsData = Awaited<ReturnType<typeof listMaterialsWithTopics>>
type MaterialRow = MaterialsData['materials'][number]
type TopicRow = MaterialsData['topics'][number]

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Materials' },
  { value: 'assignment', label: 'Assignments' },
  { value: 'quiz', label: 'Quizzes' },
  { value: 'exam', label: 'Exams' },
  { value: 'project', label: 'Projects' },
  { value: 'module', label: 'Modules' },
  { value: 'material', label: 'Materials' },
]

const NO_TOPIC = { id: 'no-topic', name: 'No Topic', description: null }

function isRealTopic(topic: TopicRow | typeof NO_TOPIC): topic is TopicRow {
  return topic.id !== 'no-topic'
}

function groupMaterialsByTopic<T extends { topic_id: string | null }>(
  materials: T[],
  topics: (TopicRow | typeof NO_TOPIC)[],
) {
  const groups = new Map<
    string,
    { topic: TopicRow | typeof NO_TOPIC; materials: T[] }
  >()

  topics.forEach((topic) => {
    groups.set(topic.id, { topic, materials: [] })
  })
  groups.set('no-topic', { topic: NO_TOPIC, materials: [] })

  materials.forEach((material) => {
    const topicId = material.topic_id ?? 'no-topic'
    const group = groups.get(topicId) ?? groups.get('no-topic')
    group?.materials.push(material)
  })

  return Array.from(groups.values()).sort((a, b) => {
    if (a.topic.id === 'no-topic') return 1
    if (b.topic.id === 'no-topic') return -1
    return 0
  })
}

function toFormValues(material: MaterialRow): MaterialFormValues & {
  fileName: string | null
  fileSize: number | null
} {
  return {
    title: material.title,
    description: material.description ?? '',
    instructions: material.instructions ?? '',
    dueDate: material.due_date ?? '',
    maxPoints: material.max_points ?? 100,
    type: material.type as MaterialFormValues['type'],
    topicId: material.topic_id ?? '',
    allowLateSubmission: material.allow_late_submission ?? true,
    published: material.published ?? true,
    fileName: material.file_name,
    fileSize: material.file_size,
  }
}

export function MaterialsTab({ subjectId, canManage }: MaterialsTabProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [typeFilter, setTypeFilter] = useState('all')
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(
    null,
  )
  const [deletingTopic, setDeletingTopic] = useState<TopicRow | null>(null)

  const [creatingMaterial, setCreatingMaterial] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<MaterialRow | null>(
    null,
  )
  const [creatingTopic, setCreatingTopic] = useState(false)
  const [editingTopic, setEditingTopic] = useState<TopicRow | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const MATERIALS_POLL_MS = 15000

  const dataQuery = useQuery({
    queryKey: ['materials', 'list', subjectId],
    queryFn: () => listMaterialsWithTopics({ data: { subjectId } }),
    refetchInterval: MATERIALS_POLL_MS,
  })

  const submissionStatusesQuery = useQuery({
    queryKey: ['submissions', 'own-statuses', subjectId],
    queryFn: () => listOwnSubmissionStatuses({ data: { subjectId } }),
    enabled: !canManage,
  })

  const submissionByMaterialId = new Map(
    (submissionStatusesQuery.data?.statuses ?? []).map((s) => [
      s.material_id,
      s,
    ]),
  )

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['materials', 'list', subjectId],
    })

  function toServerFields(values: MaterialFormValues) {
    return {
      title: values.title,
      description: values.description || undefined,
      instructions: values.instructions || undefined,
      dueDate: values.dueDate
        ? new Date(values.dueDate).toISOString()
        : undefined,
      maxPoints: values.maxPoints,
      type: values.type,
      topicId: values.topicId || undefined,
      allowLateSubmission: values.allowLateSubmission,
      published: values.published,
    }
  }

  const createMaterialMutation = useMutation({
    mutationFn: async ({
      values,
      fileAction,
    }: {
      values: MaterialFormValues
      fileAction: { file: File | null; removeExisting: boolean }
    }) => {
      const material = await createMaterial({
        data: { subjectId, ...toServerFields(values) },
      })
      if (fileAction.file) {
        const formData = new FormData()
        formData.set('materialId', material.id)
        formData.set('file', fileAction.file)
        await uploadMaterialFile({ data: formData })
      }
      return material
    },
    onSuccess: async () => {
      setFormError(null)
      setCreatingMaterial(false)
      await invalidate()
    },
    onError: (error: Error) => setFormError(error.message),
  })

  const updateMaterialMutation = useMutation({
    mutationFn: async ({
      materialId,
      values,
      fileAction,
    }: {
      materialId: string
      values: MaterialFormValues
      fileAction: { file: File | null; removeExisting: boolean }
    }) => {
      const material = await updateMaterial({
        data: { materialId, ...toServerFields(values) },
      })
      if (fileAction.file) {
        const formData = new FormData()
        formData.set('materialId', materialId)
        formData.set('file', fileAction.file)
        await uploadMaterialFile({ data: formData })
      } else if (fileAction.removeExisting) {
        await removeMaterialFile({ data: { materialId } })
      }
      return material
    },
    onSuccess: async () => {
      setFormError(null)
      setEditingMaterial(null)
      await invalidate()
    },
    onError: (error: Error) => setFormError(error.message),
  })

  const deleteMaterialMutation = useMutation({
    mutationFn: (materialId: string) =>
      deleteMaterial({ data: { materialId } }),
    onSuccess: invalidate,
  })

  const createTopicMutation = useMutation({
    mutationFn: (values: { name: string; description: string }) =>
      createTopic({ data: { subjectId, ...values } }),
    onSuccess: async () => {
      setFormError(null)
      setCreatingTopic(false)
      await invalidate()
    },
    onError: (error: Error) => setFormError(error.message),
  })

  const updateTopicMutation = useMutation({
    mutationFn: (values: {
      topicId: string
      name: string
      description: string
    }) => updateTopic({ data: values }),
    onSuccess: async () => {
      setFormError(null)
      setEditingTopic(null)
      await invalidate()
    },
    onError: (error: Error) => setFormError(error.message),
  })

  const deleteTopicMutation = useMutation({
    mutationFn: (topicId: string) => deleteTopic({ data: { topicId } }),
    onSuccess: invalidate,
  })

  const materials = dataQuery.data?.materials ?? []
  const topics = dataQuery.data?.topics ?? []

  const filteredMaterials = materials.filter(
    (material) => typeFilter === 'all' || material.type === typeFilter,
  )
  const sortedGroups = groupMaterialsByTopic(filteredMaterials, topics)

  const handleDeleteMaterial = (materialId: string) => {
    setDeletingMaterialId(materialId)
  }

  const confirmDeleteMaterial = () => {
    if (!deletingMaterialId) return
    deleteMaterialMutation.mutate(deletingMaterialId)
    setDeletingMaterialId(null)
  }

  const handleDeleteTopic = (topic: TopicRow) => {
    setDeletingTopic(topic)
  }

  const confirmDeleteTopic = () => {
    if (!deletingTopic) return
    deleteTopicMutation.mutate(deletingTopic.id)
    setDeletingTopic(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Classwork</h2>
          <p className="text-sm text-gray-600 mt-1">
            {materials.length} material{materials.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreatingTopic(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FolderPlus size={16} />
              Topic
            </button>
            <button
              onClick={() => setCreatingMaterial(true)}
              className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white text-sm font-medium rounded-lg hover:bg-classly-green/90 transition-colors shadow-sm"
            >
              <Plus size={16} strokeWidth={2.5} />
              Create
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter size={16} className="text-gray-400 shrink-0" />
        {TYPE_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setTypeFilter(option.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              typeFilter === option.value
                ? 'bg-classly-green text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {dataQuery.isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="font-semibold text-red-900 mb-1">
            Failed to load materials
          </h3>
          <p className="text-sm text-red-700">{dataQuery.error.message}</p>
        </div>
      ) : dataQuery.isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No materials yet
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
            {canManage
              ? 'Get started by creating your first course material.'
              : "Your instructor hasn't posted any content yet."}
          </p>
          {canManage && (
            <button
              onClick={() => setCreatingMaterial(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-classly-green text-white font-medium rounded-lg hover:bg-classly-green/90 transition-all shadow-sm"
            >
              <Plus size={18} strokeWidth={2.5} />
              Create First Material
            </button>
          )}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No materials found
          </h3>
          <p className="text-gray-600">
            Try adjusting your filter
            {canManage ? ' or create a new material' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(({ topic, materials: topicMaterials }) => {
            if (topicMaterials.length === 0) return null

            return (
              <div
                key={topic.id}
                className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div className="bg-green-50 border-b border-green-100 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-classly-green rounded-lg flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {topic.name}
                        </h3>
                        {topic.description && (
                          <p className="text-sm text-gray-600 mt-0.5">
                            {topic.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-classly-green bg-white px-2 py-1 rounded uppercase tracking-wide">
                        {topicMaterials.length} Material
                        {topicMaterials.length !== 1 ? 's' : ''}
                      </span>

                      {canManage && isRealTopic(topic) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1.5 text-gray-600 hover:bg-white rounded-lg transition-colors">
                            <MoreVertical size={16} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingTopic(topic)}>
                              <Edit />
                              Edit topic
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDeleteTopic(topic)}
                            >
                              <Trash2 />
                              Delete topic
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {topicMaterials.map((material) => (
                    <MaterialCard
                      key={material.id}
                      material={material}
                      canManage={canManage}
                      submission={
                        submissionByMaterialId.get(material.id) ?? null
                      }
                      onClick={() =>
                        navigate({
                          to: '/classroom/$subjectId/materials/$materialId',
                          params: { subjectId, materialId: material.id },
                        })
                      }
                      onEdit={() => setEditingMaterial(material)}
                      onDelete={() => handleDeleteMaterial(material.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {creatingMaterial && (
        <CreateMaterialModal
          topics={topics}
          onClose={() => {
            setCreatingMaterial(false)
            setFormError(null)
          }}
          onSubmit={(values, fileAction) =>
            createMaterialMutation.mutateAsync({ values, fileAction })
          }
          submitting={createMaterialMutation.isPending}
          error={formError}
        />
      )}

      {editingMaterial && (
        <EditMaterialModal
          topics={topics}
          initial={toFormValues(editingMaterial)}
          onClose={() => {
            setEditingMaterial(null)
            setFormError(null)
          }}
          onSubmit={(values, fileAction) =>
            updateMaterialMutation.mutateAsync({
              materialId: editingMaterial.id,
              values,
              fileAction,
            })
          }
          submitting={updateMaterialMutation.isPending}
          error={formError}
        />
      )}

      {creatingTopic && (
        <CreateTopicModal
          mode="create"
          onClose={() => {
            setCreatingTopic(false)
            setFormError(null)
          }}
          onSubmit={(values) => createTopicMutation.mutateAsync(values)}
          submitting={createTopicMutation.isPending}
          error={formError}
        />
      )}

      {editingTopic && (
        <CreateTopicModal
          mode="edit"
          initial={{
            name: editingTopic.name,
            description: editingTopic.description,
          }}
          onClose={() => {
            setEditingTopic(null)
            setFormError(null)
          }}
          onSubmit={(values) =>
            updateTopicMutation.mutateAsync({
              topicId: editingTopic.id,
              ...values,
            })
          }
          submitting={updateTopicMutation.isPending}
          error={formError}
        />
      )}

      <AlertDialog
        open={deletingMaterialId !== null}
        onOpenChange={(open) => !open && setDeletingMaterialId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this material?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeleteMaterial}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deletingTopic !== null}
        onOpenChange={(open) => !open && setDeletingTopic(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete topic "{deletingTopic?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Materials will be moved to "No Topic".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeleteTopic}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}