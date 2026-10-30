import { useSyncExternalStore } from 'react'
import { getAnnouncement, subscribeAnnouncements } from '@/shared/ui/announcer'

export function LiveRegion() {
  const text = useSyncExternalStore(subscribeAnnouncements, getAnnouncement)
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-region">
      {text}
    </div>
  )
}
