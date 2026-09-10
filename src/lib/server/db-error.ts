export function dbError(
  error: { message: string; code?: string } | Error,
  fallback = 'Something went wrong. Please try again.',
): Error {
   
  console.error('[db error]', error)
  return new Error(fallback)
}