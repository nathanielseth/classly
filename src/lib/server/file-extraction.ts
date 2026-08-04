import { PDFParse } from 'pdf-parse'

const MAX_CHARS = 8000
// generous ceiling on how much of the doc we read before truncating
const MAX_PDF_PAGES = 15

export interface ExtractedFile {
  text: string
  truncated: boolean
}

function truncate(text: string): ExtractedFile {
  const trimmed = text.trim()
  if (trimmed.length <= MAX_CHARS) {
    return { text: trimmed, truncated: false }
  }
  return { text: trimmed.slice(0, MAX_CHARS), truncated: true }
}

async function extractPdfText(buffer: ArrayBuffer): Promise<ExtractedFile> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText({
      partial: Array.from({ length: MAX_PDF_PAGES }, (_, i) => i + 1),
    })
    return truncate(result.text)
  } finally {
    await parser.destroy()
  }
}

function isPdf(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.pdf')
}

function isPlainText(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return lower.endsWith('.txt') || lower.endsWith('.md')
}

export async function extractFileContent(
  fileUrl: string,
  fileName: string,
): Promise<ExtractedFile | null> {
  if (!isPdf(fileName) && !isPlainText(fileName)) return null

  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Could not download the attached file (${response.status}).`)
  }

  if (isPdf(fileName)) {
    return extractPdfText(await response.arrayBuffer())
  }

  return truncate(await response.text())
}