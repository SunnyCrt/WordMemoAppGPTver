export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export function normalizeText(s: string) {
  return s.trim().replace(/\s+/g, ' ')
}

export function clampLen(s: string, max: number) {
  const t = normalizeText(s)
  return t.length > max ? t.slice(0, max) : t
}

export function localeCmp(a: string, b: string) {
  return a.localeCompare(b, 'ko')
}
