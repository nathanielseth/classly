import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Bot,
  ChevronDown,
  Mail,
  MessageCircle,
} from 'lucide-react'

import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/help')({
  component: HelpPage,
})

type Role = 'student' | 'instructor' | 'admin'

function HelpPage() {
  const { userState } = Route.useRouteContext()

  if (userState.status !== 'approved') return null

  return <HelpView role={userState.profile.role} />
}

function HelpView({ role }: { role: Role }) {
  const faqs = getFaqsForRole(role)
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get support or find answers to common questions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/messages"
          className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-float"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageCircle size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Message someone
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {role === 'student'
                ? "Reach your instructor directly if you're stuck."
                : 'Reach a student, colleague, or admin directly.'}
            </p>
          </div>
        </Link>

        <Link
          to="/ai"
          className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-float"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Bot size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Ask the AI Assistant
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Get instant answers about your coursework or how Classly works.
            </p>
          </div>
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="border-b border-border p-6">
          <h2 className="text-base font-semibold text-foreground">
            Frequently asked questions
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quick answers for common {roleLabel[role]} questions.
          </p>
        </div>

        <div className="divide-y divide-border">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id
            return (
              <div key={faq.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-secondary/40"
                >
                  <span className="text-sm font-medium text-foreground">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      'shrink-0 text-muted-foreground transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 text-sm text-muted-foreground">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Mail size={16} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Still stuck?
          </p>
          <p className="text-sm text-muted-foreground">
            Email{' '}
            <a
              href="mailto:support@classly.app"
              className="font-medium text-primary hover:underline"
            >
              support@classly.app
            </a>{' '}
            and we'll get back to you.
          </p>
        </div>
      </div>
    </div>
  )
}

const roleLabel: Record<Role, string> = {
  student: 'student',
  instructor: 'instructor',
  admin: 'admin',
}

interface Faq {
  id: string
  question: string
  answer: string
}

function getFaqsForRole(role: Role): Faq[] {
  const shared: Faq[] = [
    {
      id: 'photo',
      question: 'How do I change my profile photo or name?',
      answer:
        'Go to Settings → Profile. You can upload a new photo or update your name there, then save your changes.',
    },
    {
      id: 'password',
      question: 'How do I change my password?',
      answer:
        "Go to Settings → Password. Enter your current password, then your new one twice to confirm.",
    },
  ]

  if (role === 'student') {
    return [
      {
        id: 'join',
        question: 'How do I join a class?',
        answer:
          'From your Dashboard, click "Join a Subject" and enter the join code your instructor shared with you.',
      },
      ...shared,
      {
        id: 'materials',
        question: "Where do I find my instructor's materials?",
        answer:
          'Open the subject from your Dashboard to see announcements, materials, and upcoming due dates for that class.',
      },
    ]
  }

  if (role === 'instructor') {
    return [
      {
        id: 'create-subject',
        question: 'How do I create a class for my students?',
        answer:
          'From your Dashboard, click "Create Subject." A join code is generated automatically for you to share with students.',
      },
      ...shared,
      {
        id: 'quiz',
        question: 'How do I generate a quiz with AI?',
        answer:
          'Open AI Assistant and switch to the Quiz Generator tab. Describe the topic and Classly will draft questions you can review and share.',
      },
    ]
  }

  return [
    {
      id: 'approve',
      question: 'How do I approve a new user?',
      answer:
        'Go to Users in the sidebar. Pending accounts are flagged there — review and approve or reject them from that list.',
    },
    ...shared,
    {
      id: 'roles',
      question: "How do I change someone's role?",
      answer:
        "Go to Users, open the person's details, and update their role from there.",
    },
  ]
}
