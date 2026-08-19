import { useState } from 'react'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import { formatDateStamp, formatDateTime } from '@/lib/date-utils'
import type { listSubmissionsForMaterial } from '@/lib/server/functions/submissions'

type Roster = Awaited<ReturnType<typeof listSubmissionsForMaterial>>['roster']

interface ExportGradesProps {
  roster: Roster
  materialTitle: string
  maxPoints: number
}

function statusLabel(submission: Roster[number]['submission']): string {
  if (!submission || submission.status === 'not_submitted')
    return 'Not submitted'
  switch (submission.status) {
    case 'submitted':
      return 'Turned in'
    case 'late':
      return 'Turned in late'
    case 'graded':
      return 'Graded'
    case 'returned':
      return 'Returned'
    default:
      return submission.status ?? 'Unknown'
  }
}

export function ExportGrades({
  roster,
  materialTitle,
  maxPoints,
}: ExportGradesProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    if (roster.length === 0) {
      toast({ variant: 'destructive', title: 'No students to export' })
      return
    }

    setIsExporting(true)
    try {
      const exportData = roster.map((entry) => ({
        'Student Name': entry.student.full_name,
        Email: entry.student.email,
        Status: statusLabel(entry.submission),
        Grade: entry.submission?.grade ?? '',
        'Out of': maxPoints,
        Percentage: entry.submission?.grade_percentage ?? '',
        'Submitted At': entry.submission?.submitted_at
          ? formatDateTime(entry.submission.submitted_at)
          : '',
        'Graded At': entry.submission?.graded_at
          ? formatDateTime(entry.submission.graded_at)
          : '',
        Late: entry.submission?.is_late ? 'Yes' : 'No',
        Feedback: entry.submission?.feedback ?? '',
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      ws['!cols'] = [
        { wch: 24 }, // student name
        { wch: 28 }, // email
        { wch: 14 }, // status
        { wch: 8 }, // grade
        { wch: 8 }, // out of
        { wch: 12 }, // prcntg
        { wch: 18 }, // submitted at
        { wch: 18 }, // graded At
        { wch: 6 }, // late
        { wch: 40 }, // feedback
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Grades')

      const safeTitle =
        materialTitle.replace(/[\\/:*?"<>|]/g, '').trim() || 'Material'
      const fileName = `${safeTitle}_Grades_${formatDateStamp()}.xlsx`

      XLSX.writeFile(wb, fileName)
      toast({
        variant: 'success',
        title: `Exported ${roster.length} student${roster.length === 1 ? '' : 's'}`,
      })
    } catch (err) {
      console.error('Grade export failed:', err)
      toast({ variant: 'destructive', title: 'Failed to export grades' })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {isExporting ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <FileSpreadsheet size={16} />
      )}
      Export to Excel
    </button>
  )
}