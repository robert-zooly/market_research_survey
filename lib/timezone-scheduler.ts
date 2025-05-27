import { SurveyInvitation } from '../types/invitation'

interface ScheduledBatch {
  timezone: string
  offset: number
  invitations: SurveyInvitation[]
  scheduledTime: Date
  localTime: string
}

// Get the next occurrence of target time in a given timezone
export function getNextTargetTimeInTimezone(timezone: string, targetHour: number = 9, targetMinute: number = 0, now: Date = new Date()): Date {
  // Get current time in the target timezone
  const currentTimeStr = now.toLocaleString('en-US', { 
    timeZone: timezone, 
    hour: 'numeric', 
    minute: 'numeric',
    hour12: false 
  })
  const [hourStr, minuteStr] = currentTimeStr.split(':')
  const currentHour = parseInt(hourStr)
  const currentMinute = parseInt(minuteStr)
  
  // Calculate how many minutes until target time
  const currentTotalMinutes = currentHour * 60 + currentMinute
  const targetTotalMinutes = targetHour * 60 + targetMinute
  
  let minutesUntilTarget: number
  
  if (currentTotalMinutes < targetTotalMinutes) {
    // It's before target time today
    minutesUntilTarget = targetTotalMinutes - currentTotalMinutes
  } else {
    // It's after target time today, so target tomorrow
    minutesUntilTarget = (24 * 60 - currentTotalMinutes) + targetTotalMinutes
  }
  
  // Add the minutes to current time
  const targetTime = new Date(now.getTime() + (minutesUntilTarget * 60 * 1000))
  
  // Set to exact target time
  targetTime.setSeconds(0, 0)
  
  return targetTime
}

// Backward compatibility - keep the old function name
export function getNext9amInTimezone(timezone: string, now: Date = new Date()): Date {
  return getNextTargetTimeInTimezone(timezone, 9, 0, now)
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
  sendTime: Date = new Date(),
  targetHour: number = 9,
  targetMinute: number = 0
): ScheduledBatch[] {
  // Filter out unsubscribed invitations
  const activeInvitations = invitations.filter(inv => !inv.unsubscribed_at)
  
  // Group by timezone
  const groups: Record<string, SurveyInvitation[]> = {}
  
  activeInvitations.forEach(inv => {
    const tz = inv.timezone || 'America/New_York'
    if (!groups[tz]) {
      groups[tz] = []
    }
    groups[tz].push(inv)
  })
  
  // Create scheduled batches
  const batches: ScheduledBatch[] = Object.entries(groups).map(([timezone, invs]) => {
    const scheduledTime = getNextTargetTimeInTimezone(timezone, targetHour, targetMinute, sendTime)
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