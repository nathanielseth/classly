import { useRef, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import {
  AlertTriangle,
  Camera,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Palette,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'

import {
  updateProfile,
  uploadAvatar,
  removeAvatar,
  changePassword,
} from '@/lib/server/functions/profile'
import { formatDate } from '@/lib/date-utils'
import { onMutationError } from '@/lib/mutation-error'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  getInitials,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ThemePicker } from '@/components/settings/ThemePicker'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})

const roleLabel: Record<'student' | 'instructor' | 'admin', string> = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Admin',
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024

function SettingsPage() {
  const { userState } = Route.useRouteContext()

  if (userState.status !== 'approved') return null

  return <SettingsForm profile={userState.profile} />
}

function SettingsForm({
  profile,
}: {
  profile: {
    id: string
    email: string
    full_name: string
    role: 'student' | 'instructor' | 'admin'
    status: 'pending' | 'approved' | 'rejected'
    avatar_url: string | null
    created_at: string | null
  }
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [fullName, setFullName] = useState(profile.full_name)
  const nameDirty =
    fullName.trim().length > 0 && fullName.trim() !== profile.full_name

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  const avatarMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return uploadAvatar({ data: formData })
    },
    onSuccess: async (updated) => {
      setAvatarUrl(updated.avatar_url)
      setPreviewUrl(null)
      toast({ variant: 'success', title: 'Profile photo updated' })
      await router.invalidate()
    },
    onError: (error: Error) => {
      setPreviewUrl(null)
      onMutationError('Failed to upload photo')(error)
    },
  })

  const removeAvatarMutation = useMutation({
    mutationFn: () => removeAvatar(),
    onSuccess: async (updated) => {
      setAvatarUrl(updated.avatar_url)
      toast({ variant: 'success', title: 'Profile photo removed' })
      await router.invalidate()
    },
    onError: onMutationError('Failed to remove photo'),
  })

  const nameMutation = useMutation({
    mutationFn: () => updateProfile({ data: { fullName: fullName.trim() } }),
    onSuccess: async () => {
      toast({ variant: 'success', title: 'Name updated' })
      await router.invalidate()
    },
    onError: onMutationError('Failed to update name'),
  })

  const passwordMutation = useMutation({
    mutationFn: () =>
      changePassword({ data: { currentPassword, newPassword } }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Password updated' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: onMutationError('Failed to update password'),
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'warning',
        title: 'Unsupported file',
        description: 'Please choose an image file.',
      })
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast({
        variant: 'warning',
        title: 'Image too large',
        description: 'Image must be smaller than 5MB.',
      })
      return
    }

    setPreviewUrl(URL.createObjectURL(file))
    avatarMutation.mutate(file)
  }

  const passwordsFilled =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword.length > 0
  const passwordsMatch = newPassword === confirmPassword
  const canSubmitPassword =
    passwordsFilled && passwordsMatch && !passwordMutation.isPending

  const handlePasswordSubmit = () => {
    if (!passwordsMatch) {
      toast({
        variant: 'warning',
        title: "Passwords don't match",
        description: 'New password and confirmation must be the same.',
      })
      return
    }
    passwordMutation.mutate()
  }

  const displayedAvatar = previewUrl ?? avatarUrl ?? undefined
  const avatarBusy = avatarMutation.isPending || removeAvatarMutation.isPending

  const sections = [
    { id: 'profile', label: 'Profile', icon: UserRound },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'password', label: 'Password', icon: KeyRound },
    { id: 'danger', label: 'Danger zone', icon: AlertTriangle },
  ] as const
  const [activeSection, setActiveSection] =
    useState<(typeof sections)[number]['id']>('profile')

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, security, and account.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft lg:grid lg:grid-cols-[200px_1fr]">
        <nav className="flex gap-1.5 overflow-x-auto border-b border-border p-3 lg:flex-col lg:overflow-visible lg:border-r lg:border-b-0 lg:bg-secondary/30 lg:p-4">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all lg:shrink',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon size={16} className="shrink-0" />
                {section.label}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0">
          {activeSection === 'profile' && (
            <section>
              <div className="border-b border-border p-6">
                <h2 className="text-base font-semibold text-foreground">
                  Profile
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  This is how you appear across Classly.
                </p>
              </div>

              <div className="p-6">
                <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar size="lg" className="size-16">
                        <AvatarImage
                          src={displayedAvatar}
                          alt={profile.full_name}
                        />
                        <AvatarFallback className="text-lg">
                          {getInitials(profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarBusy}
                        aria-label="Change profile photo"
                        className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                      >
                        {avatarMutation.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Camera size={12} />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {profile.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, WEBP or GIF. Max 5MB.
                      </p>
                      <div className="flex items-center gap-3 pt-0.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={avatarBusy}
                          className="text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
                        >
                          Change photo
                        </button>
                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={() => removeAvatarMutation.mutate()}
                            disabled={avatarBusy}
                            className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline disabled:pointer-events-none disabled:opacity-50"
                          >
                            {removeAvatarMutation.isPending ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Trash2 size={11} />
                            )}
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Badge variant="default" className="capitalize">
                      {roleLabel[profile.role]}
                    </Badge>
                    <Badge variant="success" className="gap-1">
                      <ShieldCheck size={12} />
                      Approved
                    </Badge>
                    {profile.created_at && (
                      <span className="text-xs whitespace-nowrap text-muted-foreground">
                        Member since {formatDate(profile.created_at)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 pt-6 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      maxLength={120}
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown to your instructors and classmates.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={profile.email} disabled />
                    <p className="text-xs text-muted-foreground">
                      Contact an admin to change your email.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-border pt-5">
                  <Button
                    onClick={() => nameMutation.mutate()}
                    disabled={!nameDirty || nameMutation.isPending}
                  >
                    {nameMutation.isPending && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    Save changes
                  </Button>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'appearance' && (
            <section>
              <div className="border-b border-border p-6">
                <h2 className="text-base font-semibold text-foreground">
                  Appearance
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Choose how Classly looks on this device.
                </p>
              </div>

              <div className="p-6">
                <ThemePicker />
              </div>
            </section>
          )}

          {activeSection === 'password' && (
            <section>
              <div className="border-b border-border p-6">
                <h2 className="text-base font-semibold text-foreground">
                  Password
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Choose a strong password you don't use elsewhere.
                </p>
              </div>

              <div className="space-y-5 p-6">
                <div className="max-w-sm space-y-1.5">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <PasswordInput
                    id="currentPassword"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    visible={showPasswords}
                    onToggleVisible={() => setShowPasswords((v) => !v)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New password</Label>
                    <PasswordInput
                      id="newPassword"
                      value={newPassword}
                      onChange={setNewPassword}
                      visible={showPasswords}
                      onToggleVisible={() => setShowPasswords((v) => !v)}
                      autoComplete="new-password"
                    />
                    {newPassword.length > 0 && newPassword.length < 6 && (
                      <p className="text-xs text-destructive">
                        At least 6 characters.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">
                      Confirm new password
                    </Label>
                    <PasswordInput
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      visible={showPasswords}
                      onToggleVisible={() => setShowPasswords((v) => !v)}
                      autoComplete="new-password"
                    />
                    {confirmPassword.length > 0 && !passwordsMatch && (
                      <p className="text-xs text-destructive">
                        Passwords don't match.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end border-t border-border pt-5">
                  <Button
                    onClick={handlePasswordSubmit}
                    disabled={!canSubmitPassword}
                  >
                    {passwordMutation.isPending && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    Update password
                  </Button>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'danger' && (
            <section>
              <div className="border-b border-border p-6">
                <h2 className="text-base font-semibold text-foreground">
                  Danger zone
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Irreversible actions. Proceed with care.
                </p>
              </div>

              <div className="divide-y divide-border">
                <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Sign out of all devices
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Ends every active session except this one.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-fit">
                    Sign out everywhere
                  </Button>
                </div>

                <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Delete account
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Permanently removes your profile and enrollment data.
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" className="w-fit">
                    Delete account
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  visible,
  onToggleVisible,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggleVisible: () => void
  autoComplete: string
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="pr-10"
      />
      <button
        type="button"
        onClick={onToggleVisible}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}