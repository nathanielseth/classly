import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface ExamLockContextValue {
  isExamInProgress: boolean
  lockExam: () => void
  unlockExam: () => void
}

const ExamLockContext = createContext<ExamLockContextValue | null>(null)

export function ExamLockProvider({ children }: { children: ReactNode }) {
  const [isExamInProgress, setIsExamInProgress] = useState(false)

  return (
    <ExamLockContext.Provider
      value={{
        isExamInProgress,
        lockExam: () => setIsExamInProgress(true),
        unlockExam: () => setIsExamInProgress(false),
      }}
    >
      {children}
    </ExamLockContext.Provider>
  )
}

export function useExamLock() {
  const ctx = useContext(ExamLockContext)
  if (!ctx) {
    throw new Error('useExamLock must be used within ExamLockProvider')
  }
  return ctx
}