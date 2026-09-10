import { useState } from 'react'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { listSubmissionsForSubject } from '@/lib/server/functions/submissions'
import { toast } from '@/components/ui/toast'
import { formatDateStamp } from '@/lib/date-utils'

interface ExportClassroomGradesProps {
  subjectId: string
  subjectName: string
}

function gradeCellValue(
  submission: { grade: number | null } | null,
): number | string {
  if (!submission || submission.grade == null) return ''
  return submission.grade
}

export function ExportClassroomGrades({
  subjectId,
  subjectName,
}: ExportClassroomGradesProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const { materials, grades } = await listSubmissionsForSubject({
        data: { subjectId },
      })

      if (grades.length === 0) {
        toast({ variant: 'destructive', title: 'No students enrolled' })
        return
      }
      if (materials.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No gradeable materials in this classroom yet',
        })
        return
      }

      const exportData = grades.map((entry) => {
        const row: Record<string, string | number> = {
          'Student Name': entry.student.full_name,
          Email: entry.student.email,
        }
        for (const material of materials) {
          const label =
            material.max_points != null
              ? `${material.title} (/${material.max_points})`
              : material.title
          row[label] = gradeCellValue(entry.submissions[material.id])
        }
        return row
      })

      const ws = XLSX.utils.json_to_sheet(exportData)

      const colWidths = [
        { wch: 24 }, // Student Name
        { wch: 28 }, // Email
        ...materials.map(() => ({ wch: 18 })),
      ]
      ws['!cols'] = colWidths

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Grades')

      const safeName =
        subjectName.replace(/[\\/:*?"<>|]/g, '').trim() || 'Classroom'
      const fileName = `${safeName}_Gradebook_${formatDateStamp()}.xlsx`

      XLSX.writeFile(wb, fileName)
      toast({
        variant: 'success',
        title: `Exported ${grades.length} student${grades.length === 1 ? '' : 's'} across ${materials.length} material${materials.length === 1 ? '' : 's'}`,
      })
    } catch (err) {
      console.error('Classroom grade export failed:', err)
      toast({
        variant: 'destructive',
        title:
          err instanceof Error ? err.message : 'Failed to export gradebook',
      })
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
      Export Gradebook
    </button>
  )
}