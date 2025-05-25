import { SurveyInvitation } from '../types/invitation'

interface ScheduledBatch {
  timezone: string
  offset: number
  invitations: SurveyInvitation[]
  scheduledTime: Date
  localTime: string
}

// Get the next occurrence of 9am in a given timezone
export function getNext9amInTimezone(timezone: string, now: Date = new Date()): Date {
  // Get current hour in the target timezone
  const currentHour = parseInt(now.toLocaleString('en-US', { 
    timeZone: timezone, 
    hour: 'numeric', 
    hour12: false 
  }))
  
  // Calculate how many hours until 9am
  let hoursUntil9am: number
  
  if (currentHour < 9) {
    // It's before 9am today
    hoursUntil9am = 9 - currentHour
  } else {
    // It's after 9am today, so target tomorrow 9am
    hoursUntil9am = (24 - currentHour) + 9
  }
  
  // Add the hours to current time
  const targetTime = new Date(now.getTime() + (hoursUntil9am * 60 * 60 * 1000))
  
  // Round to exact hour (9:00:00)
  targetTime.setMinutes(0, 0, 0)
  
  return targetTime
}

// Get timezone offset in hours from UTC
export function getTimezoneOffsetHours(timezone: string): number {
  const offsets: Record<string, number> = {
    'America/New_York': -5,      // EST
    'America/Chicago': -6,       // CST
    'America/Denver': -7,        // MST
    'America/Phoenix': -7,       // MST (no DST)
    'America/Los_Angeles': -8,   // PST
    'America/Anchorage': -9,     // AKST
    'Pacific/Honolulu': -10      // HST
  }
  
  // During daylight saving time (roughly March-November), subtract 1 hour
  const now = new Date()
  const month = now.getMonth() + 1
  const isDST = month >= 3 && month <= 11
  
  let offset = offsets[timezone] || -5
  
  // Arizona doesn't observe DST
  if (timezone !== 'America/Phoenix' && isDST) {
    offset += 1
  }
  
  return offset
}

// Group invitations by timezone and calculate send times
export function scheduleByTimezone(
  invitations: SurveyInvitation[],
  sendTime: Date = new Date()
): ScheduledBatch[] {
  // Group by timezone
  const groups: Record<string, SurveyInvitation[]> = {}
  
  invitations.forEach(inv => {
    const tz = inv.timezone || 'America/New_York'
    if (!groups[tz]) {
      groups[tz] = []
    }
    groups[tz].push(inv)
  })
  
  // Create scheduled batches
  const batches: ScheduledBatch[] = Object.entries(groups).map(([timezone, invs]) => {
    const scheduledTime = getNext9amInTimezone(timezone, sendTime)
    const offset = getTimezoneOffsetHours(timezone)
    
    return {
      timezone,
      offset,
      invitations: invs,
      scheduledTime,
      localTime: scheduledTime.toLocaleString('en-US', { 
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    }
  })
  
  // Sort by scheduled time (east to west)
  return batches.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
}

// Check if it's time to send a batch
export function shouldSendNow(scheduledTime: Date, now: Date = new Date()): boolean {
  return now >= scheduledTime
}

// Get human-readable time until send
export function getTimeUntilSend(scheduledTime: Date, now: Date = new Date()): string {
  const diff = scheduledTime.getTime() - now.getTime()
  
  if (diff <= 0) return 'Ready to send'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    const remainingHours = hours % 24
    return `${days}d ${remainingHours}h ${minutes}m`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Format timezone name for display
export function formatTimezoneName(timezone: string): string {
  const names: Record<string, string> = {
    'America/New_York': 'Eastern',
    'America/Chicago': 'Central',
    'America/Denver': 'Mountain',
    'America/Phoenix': 'Arizona',
    'America/Los_Angeles': 'Pacific',
    'America/Anchorage': 'Alaska',
    'Pacific/Honolulu': 'Hawaii'
  }
  
  return names[timezone] || timezone
}