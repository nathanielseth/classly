import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '../middleware'
import { dbError } from '../db-error'

const PROFILE_COLUMNS =
  'id, email, full_name, role, status, avatar_url, created_at'

const updateProfileInput = z.object({
  fullName: z.string().trim().min(1).max(120),
})

export const updateProfile = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(updateProfileInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select(PROFILE_COLUMNS)
      .single()

    if (error) throw dbError(error)
    return updated
  })

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_SIZE = 5 * 1024 * 1024
const ALLOWED_AVATAR_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

function avatarPathFromUrl(fileUrl: string) {
  const marker = `/${AVATAR_BUCKET}/`
  const index = fileUrl.indexOf(marker)
  if (index === -1) return null
  return fileUrl.slice(index + marker.length)
}

export const uploadAvatar = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((formData: unknown) => {
    if (!(formData instanceof FormData)) {
      throw new Error('Expected multipart form data.')
    }
    const file = formData.get('file')
    if (!(file instanceof File)) {
      throw new Error('file is required.')
    }
    if (file.size > MAX_AVATAR_SIZE) {
      throw new Error('Image must be smaller than 5MB.')
    }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !ALLOWED_AVATAR_EXTENSIONS.has(ext)) {
      throw new Error('Unsupported image type. Use JPG, PNG, WEBP, or GIF.')
    }
    return { file, ext }
  })
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    const { data: existing } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', profile.id)
      .single()

    if (existing?.avatar_url) {
      const oldPath = avatarPathFromUrl(existing.avatar_url)
      if (oldPath) {
        await supabase.storage.from(AVATAR_BUCKET).remove([oldPath])
      }
    }

    const filePath = `${profile.id}/${Date.now()}.${data.ext}`

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, data.file, { cacheControl: '3600', upsert: false })

    if (uploadError) throw dbError(uploadError)

    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select(PROFILE_COLUMNS)
      .single()

    if (error) throw dbError(error)
    return updated
  })

export const removeAvatar = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { supabase, profile } = context

    const { data: existing } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', profile.id)
      .single()

    if (existing?.avatar_url) {
      const oldPath = avatarPathFromUrl(existing.avatar_url)
      if (oldPath) {
        await supabase.storage.from(AVATAR_BUCKET).remove([oldPath])
      }
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select(PROFILE_COLUMNS)
      .single()

    if (error) throw dbError(error)
    return updated
  })

const changePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
})

export const changePassword = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(changePasswordInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    // re-verify identity with the current password b4 rotating it
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: data.currentPassword,
    })
    if (verifyError) throw new Error('Current password is incorrect.')

    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    })
    if (error) throw new Error(error.message)
  })