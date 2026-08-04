import { ChevronRight, BookOpen, GraduationCap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { listSubjects } from '@/lib/server/functions/subjects'
import { listMaterialsWithTopics } from '@/lib/server/functions/materials'

export type PickedMaterial = Awaited<
  ReturnType<typeof listMaterialsWithTopics>
>['materials'][number]

interface MaterialPickerProps {
  selectedSubjectId: string | null
  selectedMaterialId: string | null
  onSelectSubject: (subjectId: string | null) => void
  onSelectMaterial: (material: PickedMaterial | null) => void
  disabled: boolean
}

export function MaterialPicker({
  selectedSubjectId,
  selectedMaterialId,
  onSelectSubject,
  onSelectMaterial,
  disabled,
}: MaterialPickerProps) {
  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'list', { includeArchived: false }],
    queryFn: () => listSubjects({ data: { includeArchived: false } }),
  })

  const materialsQuery = useQuery({
    queryKey: ['materials', 'withTopics', selectedSubjectId],
    queryFn: () =>
      listMaterialsWithTopics({ data: { subjectId: selectedSubjectId! } }),
    enabled: selectedSubjectId !== null,
  })

  const subjects = subjectsQuery.data?.subjects ?? []
  const materials = (materialsQuery.data?.materials ?? []).filter(
    (m) => m.description || m.instructions || m.file_url,
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <BookOpen size={16} className="text-gray-400" />
          Select Subject
        </label>
        <div className="relative">
          <select
            value={selectedSubjectId ?? ''}
            onChange={(e) => {
              onSelectSubject(e.target.value || null)
              onSelectMaterial(null)
            }}
            disabled={disabled}
            className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-classly-green focus:border-transparent outline-none appearance-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">Choose a subject...</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} - {subject.name}
              </option>
            ))}
          </select>
          <ChevronRight
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none"
            size={16}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <GraduationCap size={16} className="text-gray-400" />
          Select Material
        </label>
        <div className="relative">
          <select
            value={selectedMaterialId ?? ''}
            onChange={(e) => {
              const material = materials.find((m) => m.id === e.target.value) ?? null
              onSelectMaterial(material)
            }}
            disabled={!selectedSubjectId || disabled || materialsQuery.isFetching}
            className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-classly-green focus:border-transparent outline-none appearance-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">
              {materialsQuery.isFetching
                ? 'Loading materials...'
                : !selectedSubjectId
                  ? 'Select a subject first'
                  : 'Choose a material...'}
            </option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.title}
              </option>
            ))}
          </select>
          <ChevronRight
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none"
            size={16}
          />
        </div>
        {selectedSubjectId &&
          !materialsQuery.isFetching &&
          materials.length === 0 && (
            <p className="text-xs text-amber-600">
              No materials with content found in this subject.
            </p>
          )}
      </div>
    </div>
  )
}