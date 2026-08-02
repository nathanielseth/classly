export function unwrapEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (embed === null || embed === undefined) return null
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed
}

export interface EnrolledStudent {
  id: string
  full_name: string
  email: string
}
