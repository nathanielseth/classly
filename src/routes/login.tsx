import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  Eye,
  EyeOff,
  AlertCircle,
  GraduationCap,
  School,
} from 'lucide-react'
import { signIn, signUp } from '@/lib/server/functions/auth-actions'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

type AuthMode = 'login' | 'register'
type Role = 'student' | 'instructor'

const ROLES: Array<{ id: Role; label: string; icon: typeof GraduationCap }> = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'instructor', label: 'Instructor', icon: School },
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
  const [rememberMe, setRememberMe] = useState(false)

  const isCvsuEmail = email.toLowerCase().endsWith('@cvsu.edu.ph')
  const showEmailWarning =
    authMode === 'register' &&
    role === 'student' &&
    email.length > 0 &&
    !isCvsuEmail

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
            ? 'Account created! Check your email and click the confirmation link before logging in.'
            : 'Account created! You can now log in.',
        )
        setAuthMode('login')
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden bg-secondary">
      {/* LEFT SIDE */}
      <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center px-6 sm:px-12 bg-card relative z-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
              <GraduationCap size={28} />
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Classly
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              The CvSU Bacoor Digital Learning Environment
            </p>
          </div>

          {/* Tabs */}
          <div className="p-1.5 bg-muted rounded-xl flex items-center gap-1 mb-6 relative">
            <div
              className="absolute top-1.5 bottom-1.5 bg-card rounded-lg shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]"
              style={{
                width: 'calc(50% - 6px)',
                left: authMode === 'login' ? '6px' : 'calc(50%)',
              }}
            />
            {(
              [
                { id: 'login', label: 'Log In' },
                { id: 'register', label: 'Register' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setAuthMode(tab.id)
                  setError(null)
                  setNotice(null)
                }}
                className={`flex-1 relative z-10 py-2 text-xs font-bold rounded-lg transition-colors duration-200 cursor-pointer ${
                  authMode === tab.id
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {notice && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 text-foreground text-sm">
              {notice}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/8 text-destructive text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full">
            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                authMode === 'register'
                  ? 'max-h-100 opacity-100 mb-4'
                  : 'max-h-0 opacity-0 mb-0'
              }`}
            >
              <div className="space-y-5 pt-1">
                <div>
                  <label className="block text-sm font-bold text-foreground/80 mb-2">
                    I am a...
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {ROLES.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setRole(r.id)}
                        className={`cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 active:scale-95 ${
                          role === r.id
                            ? 'bg-primary border-classly-green text-primary-foreground shadow-md shadow-primary/20'
                            : 'bg-card border-border text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        <r.icon size={20} className="mb-1.5" />
                        <span className="text-xs font-semibold">{r.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground/80 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full px-4 py-2.5 rounded-lg border border-input focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 focus:outline-none transition-all placeholder:text-muted-foreground/70"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={authMode === 'register'}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-foreground/80 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all placeholder:text-muted-foreground/70 ${
                      showEmailWarning
                        ? 'border-warning focus:border-warning focus:ring-2 focus:ring-warning/20'
                        : 'border-input focus:border-classly-green focus:ring-2 focus:ring-classly-green/20'
                    }`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  {showEmailWarning && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 group cursor-help">
                      <AlertCircle size={20} className="text-warning" />
                      <div className="absolute bottom-full right-0 mb-2 w-max max-w-55 p-2.5 bg-foreground text-background text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        Non-CvSU emails require admin verification.
                        <div className="absolute top-full right-2 -mt-1 border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-bold text-foreground/80 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    className="w-full px-4 py-2.5 rounded-lg border border-input focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 focus:outline-none transition-all placeholder:text-muted-foreground/70"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted rounded-md transition-all cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember me / Forgot (login only) */}
            <div
              className={`grid transition-[grid-template-rows] duration-300 ${
                authMode === 'login' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex items-center justify-between pt-5 pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-classly-green rounded border-input focus:ring-classly-green cursor-pointer"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="text-sm text-muted-foreground">Remember me</span>
                  </label>
                  <a
                    href="#"
                    className="text-sm font-semibold text-classly-green hover:underline"
                  >
                    Forgot Password?
                  </a>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/30 transition-all duration-200 transform hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-card border-t-transparent rounded-full animate-spin" />
              ) : authMode === 'login' ? (
                'Log In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="hidden md:block w-1/2 h-full relative bg-[#274a34] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop"
          alt="University Campus"
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay hover:scale-105 transition-transform duration-[30s] ease-linear"
        />
        <div className="absolute inset-0 bg-linear-to-br from-[#274a34]/95 via-[#274a34]/80 to-[#274a34]/90" />
        <div className="absolute inset-0 flex flex-col justify-center px-16 text-white z-20">
          <div className="w-16 h-16 rounded-2xl bg-card/10 backdrop-blur-md flex items-center justify-center mb-8 border border-card/20 shadow-2xl">
            <GraduationCap size={36} className="text-white" />
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight tracking-tight">
            Elevate your <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fef08a] to-[#fbbf24]">
              Learning Journey
            </span>
          </h2>
          <p className="text-lg text-[#e5e7eb] max-w-md leading-relaxed font-light opacity-90">
            Welcome to the AI-Powered learning management system of Cavite State
            University Bacoor.
          </p>
        </div>
      </div>
    </div>
  )
}