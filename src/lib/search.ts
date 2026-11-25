export type SearchEntry = {
  type: 'post' | 'project'
  slug: string
  title: string
  summary: string
  date?: string
  body: string
}

export const MIN_SEARCH_LENGTH = 2
const MAX_SEARCH_LENGTH = 100

let indexPromise: Promise<SearchEntry[]> | undefined

export function loadSearchIndex(): Promise<SearchEntry[]> {
  indexPromise ??= fetch('/search-index.json')
    .then((res) => {
      if (!res.ok) throw new Error(`search index: HTTP ${res.status}`)
      return res.json() as Promise<SearchEntry[]>
    })
    .catch((error) => {
      indexPromise = undefined
      throw error
    })
  return indexPromise
}

export function normalizeQuery(input: string): string {
  return input.trim().slice(0, MAX_SEARCH_LENGTH).replace(/\s+/g, ' ')
}

// Every word must appear somewhere; title hits rank above summary hits above body-only hits.
export function searchEntries(entries: SearchEntry[], rawQuery: string) {
  const terms = normalizeQuery(rawQuery).toLowerCase().split(' ').filter(Boolean)
  if (terms.join(' ').length < MIN_SEARCH_LENGTH) return { posts: [], projects: [] }

  const scored = entries
    .map((entry) => {
      const title = entry.title.toLowerCase()
      const summary = entry.summary.toLowerCase()
      const body = entry.body.toLowerCase()
      let score = 0
      for (const term of terms) {
        if (title.includes(term)) score += 3
        else if (summary.includes(term)) score += 2
        else if (body.includes(term)) score += 1
        else return null
      }
      return { entry, score }
    })
    .filter((hit): hit is { entry: SearchEntry; score: number } => hit !== null)
    .sort((a, b) => b.score - a.score || (b.entry.date || '').localeCompare(a.entry.date || ''))
    .map((hit) => hit.entry)

  return {
    posts: scored.filter((e) => e.type === 'post'),
    projects: scored.filter((e) => e.type === 'project'),
  }
}
