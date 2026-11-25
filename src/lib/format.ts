// Content dates are calendar dates (YYYY-MM-DD), parsed as UTC midnight. Formatting
// in UTC keeps the server-rendered HTML and the hydrated client from disagreeing
// by a day in western time zones.
export function formatDate(date: string, month: 'long' | 'short' = 'long', withDay = true): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month,
    day: withDay ? 'numeric' : undefined,
    timeZone: 'UTC',
  })
}

export function readingMinutes(markdown: string): number {
  const words = markdown.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 230))
}
