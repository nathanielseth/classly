import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '../middleware'
import { assertSubjectAccess } from '../subject-access'
import { extractFileContent } from '../file-extraction'
import type { getServerSupabase } from '../supabase'

const upcomingMaterialsInput = z.object({
  limit: z.number().int().positive().max(50).default(5),
})

export const getUpcomingMaterials = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(upcomingMaterialsInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'student') {
      return { materials: [] }
    }

    const { data: materials, error } = await supabase
      .from('materials')
      .select(
        `
        id, title, type, due_date, max_points,
        subject:subjects!inner(
          id, name, code,
          enrollments!inner(student_id)
        )
      `,
      )
      .eq('subject.enrollments.student_id', profile.id)
      .eq('published', true)
      .gte('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(data.limit)

    if (error) throw new Error(error.message)

    return { materials: materials ?? [] }
  })

const MATERIAL_TYPES = [
  'assignment',
  'quiz',
  'exam',
  'project',
  'module',
  'material',
  'others',
] as const

const materialFieldsInput = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  instructions: z.string().trim().max(5000).optional(),
  dueDate: z.iso.datetime().optional(),
  maxPoints: z.number().int().min(0).max(1000).default(100),
  type: z.enum(MATERIAL_TYPES).default('assignment'),
  topicId: z.uuid().optional(),
  allowLateSubmission: z.boolean().default(true),
  published: z.boolean().default(true),
}

const MATERIAL_COLUMNS =
  'id, subject_id, topic_id, title, description, instructions, due_date, max_points, type, allow_late_submission, published, file_url, file_name, file_size, created_at, updated_at'

const listMaterialsInput = z.object({
  subjectId: z.uuid(),
})

export const listMaterialsWithTopics = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listMaterialsInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context
    await assertSubjectAccess(supabase, profile, data.subjectId)

    let materialsQuery = supabase
      .from('materials')
      .select(MATERIAL_COLUMNS)
      .eq('subject_id', data.subjectId)
      .order('created_at', { ascending: false })

    if (profile.role === 'student') {
      materialsQuery = materialsQuery.eq('published', true)
    }

    const [
      { data: materials, error: materialsError },
      { data: topics, error: topicsError },
    ] = await Promise.all([
      materialsQuery,
      supabase
        .from('topics')
        .select('id, subject_id, name, description, order_index, created_at')
        .eq('subject_id', data.subjectId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    if (materialsError) throw new Error(materialsError.message)
    if (topicsError) throw new Error(topicsError.message)

    return {
      materials: materials ?? [],
      topics: topics ?? [],
    }
  })

const getMaterialInput = z.object({
  materialId: z.uuid(),
})

export const getMaterial = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(getMaterialInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    const { data: material, error } = await supabase
      .from('materials')
      .select(MATERIAL_COLUMNS)
      .eq('id', data.materialId)
      .single()

    if (error || !material) throw new Error('Material not found.')

    await assertSubjectAccess(supabase, profile, material.subject_id)

    if (profile.role === 'student' && !material.published) {
      throw new Error('Material not found.')
    }

    return material
  })

const materialContentForAiInput = z.object({
  materialId: z.uuid(),
})

export const getMaterialContentForAi = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(materialContentForAiInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    const { data: material, error } = await supabase
      .from('materials')
      .select(
        'subject_id, title, description, instructions, published, file_url, file_name',
      )
      .eq('id', data.materialId)
      .single()

    if (error || !material) throw new Error('Material not found.')

    await assertSubjectAccess(supabase, profile, material.subject_id)

    if (profile.role === 'student' && !material.published) {
      throw new Error('Material not found.')
    }

    const textParts = [material.description, material.instructions].filter(
      (part): part is string => Boolean(part?.trim()),
    )

    let fileTruncated = false
    if (material.file_url && material.file_name) {
      const extracted = await extractFileContent(
        material.file_url,
        material.file_name,
      )
      if (extracted) {
        textParts.push(extracted.text)
        fileTruncated = extracted.truncated
      }
    }

    return {
      title: material.title,
      content: textParts.join('\n\n').trim(),
      hasFileContent: Boolean(material.file_url),
      fileTruncated,
    }
  })

function assertCanManageMaterials(profile: { role: string }) {
  if (profile.role !== 'instructor' && profile.role !== 'admin') {
    throw new Error('Only instructors can manage course materials.')
  }
}

const createMaterialInput = z.object({
  subjectId: z.uuid(),
  ...materialFieldsInput,
})

export const createMaterial = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(createMaterialInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context
    assertCanManageMaterials(profile)
    await assertSubjectAccess(supabase, profile, data.subjectId)

    if (data.topicId) {
      await assertTopicBelongsToSubject(supabase, data.topicId, data.subjectId)
    }

    const { data: material, error } = await supabase
      .from('materials')
      .insert({
        subject_id: data.subjectId,
        title: data.title,
        description: data.description || null,
        instructions: data.instructions || null,
        due_date: data.dueDate || null,
        max_points: data.maxPoints,
        type: data.type,
        topic_id: data.topicId || null,
        allow_late_submission: data.allowLateSubmission,
        published: data.published,
      })
      .select(MATERIAL_COLUMNS)
      .single()

    if (error) throw new Error(error.message)
    return material
  })

const updateMaterialInput = z.object({
  materialId: z.uuid(),
  ...materialFieldsInput,
})

export const updateMaterial = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(updateMaterialInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context
    assertCanManageMaterials(profile)

    const subjectId = await getMaterialSubjectId(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, subjectId)

    if (data.topicId) {
      await assertTopicBelongsToSubject(supabase, data.topicId, subjectId)
    }

    const { data: material, error } = await supabase
      .from('materials')
      .update({
        title: data.title,
        description: data.description || null,
        instructions: data.instructions || null,
        due_date: data.dueDate || null,
        max_points: data.maxPoints,
        type: data.type,
        topic_id: data.topicId || null,
        allow_late_submission: data.allowLateSubmission,
        published: data.published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.materialId)
      .select(MATERIAL_COLUMNS)
      .single()

    if (error) throw new Error(error.message)
    return material
  })

const deleteMaterialInput = z.object({
  materialId: z.uuid(),
})

export const deleteMaterial = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(deleteMaterialInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context
    assertCanManageMaterials(profile)

    const subjectId = await getMaterialSubjectId(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, subjectId)

    const { data: material } = await supabase
      .from('materials')
      .select('file_url')
      .eq('id', data.materialId)
      .single()

    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', data.materialId)
    if (error) throw new Error(error.message)

    if (material?.file_url) {
      const path = storagePathFromUrl(material.file_url)
      if (path) {
        await supabase.storage.from(MATERIALS_BUCKET).remove([path])
      }
    }

    return { id: data.materialId }
  })

const MATERIALS_BUCKET = 'course-files'
const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_MATERIAL_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'zip',
  'txt',
  'jpg',
  'jpeg',
  'png',
])

function storagePathFromUrl(fileUrl: string) {
  const marker = `/${MATERIALS_BUCKET}/`
  const index = fileUrl.indexOf(marker)
  if (index === -1) return null
  return fileUrl.slice(index + marker.length)
}

export const uploadMaterialFile = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((formData: unknown) => {
    if (!(formData instanceof FormData)) {
      throw new Error('Expected multipart form data.')
    }
    const materialId = formData.get('materialId')
    const file = formData.get('file')
    if (typeof materialId !== 'string' || !materialId) {
      throw new Error('materialId is required.')
    }
    if (!(file instanceof File)) {
      throw new Error('file is required.')
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 10MB.')
    }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !ALLOWED_MATERIAL_EXTENSIONS.has(ext)) {
      throw new Error(
        'Unsupported file type. Allowed: PDF, Word, PowerPoint, Excel, ZIP, TXT, or image files.',
      )
    }
    return { materialId, file }
  })
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context
    assertCanManageMaterials(profile)

    const subjectId = await getMaterialSubjectId(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, subjectId)

    const { data: existing } = await supabase
      .from('materials')
      .select('file_url')
      .eq('id', data.materialId)
      .single()

    if (existing?.file_url) {
      const oldPath = storagePathFromUrl(existing.file_url)
      if (oldPath) {
        await supabase.storage.from(MATERIALS_BUCKET).remove([oldPath])
      }
    }

    const fileExt = data.file.name.split('.').pop() ?? 'bin'
    const filePath = `materials/${subjectId}/${data.materialId}_${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .upload(filePath, data.file, { cacheControl: '3600', upsert: false })

    if (uploadError) throw new Error(uploadError.message)

    const {
      data: { publicUrl },
    } = supabase.storage.from(MATERIALS_BUCKET).getPublicUrl(filePath)

    const { data: material, error } = await supabase
      .from('materials')
      .update({
        file_url: publicUrl,
        file_name: data.file.name,
        file_size: data.file.size,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.materialId)
      .select(MATERIAL_COLUMNS)
      .single()

    if (error) throw new Error(error.message)
    return material
  })

const removeMaterialFileInput = z.object({
  materialId: z.uuid(),
})

export const removeMaterialFile = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(removeMaterialFileInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context
    assertCanManageMaterials(profile)

    const subjectId = await getMaterialSubjectId(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, subjectId)

    const { data: existing } = await supabase
      .from('materials')
      .select('file_url')
      .eq('id', data.materialId)
      .single()

    if (existing?.file_url) {
      const oldPath = storagePathFromUrl(existing.file_url)
      if (oldPath) {
        await supabase.storage.from(MATERIALS_BUCKET).remove([oldPath])
      }
    }

    const { data: material, error } = await supabase
      .from('materials')
      .update({
        file_url: null,
        file_name: null,
        file_size: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.materialId)
      .select(MATERIAL_COLUMNS)
      .single()

    if (error) throw new Error(error.message)
    return material
  })

async function getMaterialSubjectId(
  supabase: ReturnType<typeof getServerSupabase>,
  materialId: string,
) {
  const { data: material, error } = await supabase
    .from('materials')
    .select('subject_id')
    .eq('id', materialId)
    .single()

  if (error || !material) throw new Error('Material not found.')
  return material.subject_id
}

async function assertTopicBelongsToSubject(
  supabase: ReturnType<typeof getServerSupabase>,
  topicId: string,
  subjectId: string,
) {
  const { data: topic, error } = await supabase
    .from('topics')
    .select('id, subject_id')
    .eq('id', topicId)
    .single()

  if (error || !topic || topic.subject_id !== subjectId) {
    throw new Error('Topic not found in this subject.')
  }
}

const topicFieldsInput = {
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
}

const createTopicInput = z.object({
  subjectId: z.uuid(),
  ...topicFieldsInput,
})

export const createTopic = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(createTopicInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context
    assertCanManageMaterials(profile)
    await assertSubjectAccess(supabase, profile, data.subjectId)

    const { data: topic, error } = await supabase
      .from('topics')
      .insert({
        subject_id: data.subjectId,
        name: data.name,
        description: data.description || null,
      })
      .select('id, subject_id, name, description, order_index, created_at')
      .single()

    if (error) throw new Error(error.message)
    return topic
  })

const updateTopicInput = z.object({
  topicId: z.uuid(),
  ...topicFieldsInput,
})

export const updateTopic = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(updateTopicInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context
    assertCanManageMaterials(profile)

    const subjectId = await getTopicSubjectId(supabase, data.topicId)
    await assertSubjectAccess(supabase, profile, subjectId)

    const { data: topic, error } = await supabase
      .from('topics')
      .update({
        name: data.name,
        description: data.description || null,
      })
      .eq('id', data.topicId)
      .select('id, subject_id, name, description, order_index, created_at')
      .single()

    if (error) throw new Error(error.message)
    return topic
  })

const deleteTopicInput = z.object({
  topicId: z.uuid(),
})

export const deleteTopic = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(deleteTopicInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context
    assertCanManageMaterials(profile)

    const subjectId = await getTopicSubjectId(supabase, data.topicId)
    await assertSubjectAccess(supabase, profile, subjectId)

    const { error: unlinkError } = await supabase
      .from('materials')
      .update({ topic_id: null })
      .eq('topic_id', data.topicId)

    if (unlinkError) throw new Error(unlinkError.message)

    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', data.topicId)
    if (error) throw new Error(error.message)

    return { id: data.topicId }
  })

async function getTopicSubjectId(
  supabase: ReturnType<typeof getServerSupabase>,
  topicId: string,
) {
  const { data: topic, error } = await supabase
    .from('topics')
    .select('subject_id')
    .eq('id', topicId)
    .single()

  if (error || !topic) throw new Error('Topic not found.')
  return topic.subject_id
}