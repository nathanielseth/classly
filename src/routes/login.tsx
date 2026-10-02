import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Eye, EyeOff, GraduationCap, School } from 'lucide-react'

import { signIn, signUp } from '@/lib/server/functions/auth-actions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InlineMessage } from '@/components/ui/inline-message'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

type AuthMode = 'login' | 'register'
type Role = 'student' | 'instructor'

const ROLES: Array<{ id: Role; label: string; icon: typeof GraduationCap }> = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'instructor', label: 'Instructor', icon: School },
]

const CAPABILITIES = [
  {
    title: 'Materials and quizzes',
    body: 'Instructors post readings and assignments by topic. Quizzes are graded automatically.',
  },
  {
    title: 'An assistant that knows your class',
    body: 'Ask questions about a subject’s materials. It is switched off while you take a quiz.',
  },
  {
    title: 'One calendar',
    body: 'Due dates and class events for every subject you are enrolled in.',
  },
]

function LoginPage() {
  const router = useRouter()

  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Role>('student')

  const isRegister = authMode === 'register'
  const isCvsuEmail = email.toLowerCase().endsWith('@cvsu.edu.ph')
  const showEmailWarning =
    isRegister && role === 'student' && email.length > 0 && !isCvsuEmail

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode)
    setError(null)
    setNotice(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)

    try {
      if (authMode === 'login') {
        await signIn({ data: { email, password } })
        await router.navigate({ to: '/' })
      } else {
        const result = await signUp({
          data: { email, password, fullName, role },
        })
        setNotice(
          result.needsEmailConfirmation
            ? 'Account created. Open the confirmation link we emailed you, then log in.'
            : 'Account created. You can log in now.',
        )
        setAuthMode('login')
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-dvh bg-card md:grid-cols-2">
      <main className="flex items-start justify-center px-6 pt-[max(3rem,16vh)] pb-12 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="size-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Classly
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {isRegister ? 'Create your account' : 'Log in'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isRegister
              ? 'Students should use their @cvsu.edu.ph email.'
              : 'Use the email you registered with.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isRegister && (
              <>
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-medium">I am a</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map((r) => (
                      <label
                        key={r.id}
                        className={cn(
                          'flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors',
                          'has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-card',
                          role === r.id
                            ? 'border-primary bg-primary/8 font-medium text-foreground'
                            : 'border-input text-muted-foreground hover:bg-secondary',
                        )}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={r.id}
                          checked={role === r.id}
                          onChange={() => setRole(r.id)}
                          className="sr-only"
                        />
                        <r.icon className="size-4" aria-hidden />
                        {r.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={showEmailWarning ? 'email-hint' : undefined}
                required
              />
              {showEmailWarning && (
                <p id="email-hint" className="text-sm text-warning">
                  Emails outside cvsu.edu.ph need admin approval before you can
                  log in.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  className="pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting
                ? isRegister
                  ? 'Creating account…'
                  : 'Logging in…'
                : isRegister
                  ? 'Create account'
                  : 'Log in'}
            </Button>

            {notice && <InlineMessage tone="success">{notice}</InlineMessage>}
            {error && <InlineMessage>{error}</InlineMessage>}
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            {isRegister ? 'Already have an account?' : 'New to Classly?'}{' '}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? 'login' : 'register')}
              className="rounded-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {isRegister ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </div>
      </main>

      <aside
        aria-label="About Classly"
        className="hidden flex-col justify-between bg-brand-panel p-12 text-brand-panel-foreground md:flex lg:p-16"
      >
        <p className="text-sm text-brand-panel-foreground/70">
          Cavite State University, Bacoor Campus
        </p>

        <div className="max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">
            Coursework, quizzes, and messages for every subject you take.
          </h2>
          <dl className="mt-10 space-y-6">
            {CAPABILITIES.map((item) => (
              <div key={item.title}>
                <dt className="text-sm font-medium">{item.title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-brand-panel-foreground/70">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <span aria-hidden />
      </aside>
    </div>
  )
}