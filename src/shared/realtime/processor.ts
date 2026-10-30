// Descarta duplicatas (por eventId) e versões antigas (por recurso).
const MAX_SEEN = 500

export function createEventProcessor() {
  const seen = new Set<string>()
  const versions = new Map<string, number>()

  return function accept(event: { eventId: string; resource: { type: string; id: string }; version: number }) {
    if (seen.has(event.eventId)) return false
    seen.add(event.eventId)
    if (seen.size > MAX_SEEN) seen.delete(seen.values().next().value!)

    const key = `${event.resource.type}:${event.resource.id}`
    if (event.version <= (versions.get(key) ?? 0)) return false
    versions.set(key, event.version)
    return true
  }
}
