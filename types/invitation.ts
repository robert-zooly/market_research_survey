export interface InvitationBatch {
  id: string
  name: string
  uploaded_at: string
  total_count: number
  sent_count: number
  opened_count: number
  completed_count: number
  unsubscribed_count: number
  csv_data?: any
  created_at: string
}

export interface SurveyInvitation {
  id: string
  token: string
  batch_id: string
  survey_id: string
  recipient_email: string
  recipient_name?: string
  recipient_state?: string
  recipient_data?: Record<string, any>
  timezone?: string
  sent_at?: string
  opened_at?: string
  completed_at?: string
  unsubscribed_at?: string
  reminder_count: number
  last_reminder_at?: string
  created_at: string
}

export interface EmailEvent {
  id: string
  invitation_id: string
  event_type: 'sent' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed'
  event_data?: Record<string, any>
  created_at: string
}

export interface CSVRow {
  email: string
  name?: string
  state?: string
  [key: string]: any
}

export interface TimezoneGroup {
  timezone: string
  offset: number
  invitations: SurveyInvitation[]
}

// US State to Timezone mapping
export const STATE_TIMEZONES: Record<string, string> = {
  // Eastern Time
  'CT': 'America/New_York',
  'DE': 'America/New_York',
  'FL': 'America/New_York',
  'GA': 'America/New_York',
  'IN': 'America/New_York',
  'ME': 'America/New_York',
  'MD': 'America/New_York',
  'MA': 'America/New_York',
  'MI': 'America/New_York',
  'NH': 'America/New_York',
  'NJ': 'America/New_York',
  'NY': 'America/New_York',
  'NC': 'America/New_York',
  'OH': 'America/New_York',
  'PA': 'America/New_York',
  'RI': 'America/New_York',
  'SC': 'America/New_York',
  'VT': 'America/New_York',
  'VA': 'America/New_York',
  'DC': 'America/New_York',
  'WV': 'America/New_York',
  
  // Central Time
  'AL': 'America/Chicago',
  'AR': 'America/Chicago',
  'IL': 'America/Chicago',
  'IA': 'America/Chicago',
  'KS': 'America/Chicago',
  'KY': 'America/Chicago',
  'LA': 'America/Chicago',
  'MN': 'America/Chicago',
  'MS': 'America/Chicago',
  'MO': 'America/Chicago',
  'NE': 'America/Chicago',
  'ND': 'America/Chicago',
  'OK': 'America/Chicago',
  'SD': 'America/Chicago',
  'TN': 'America/Chicago',
  'TX': 'America/Chicago',
  'WI': 'America/Chicago',
  
  // Mountain Time
  'AZ': 'America/Phoenix',
  'CO': 'America/Denver',
  'ID': 'America/Denver',
  'MT': 'America/Denver',
  'NV': 'America/Denver',
  'NM': 'America/Denver',
  'UT': 'America/Denver',
  'WY': 'America/Denver',
  
  // Pacific Time
  'CA': 'America/Los_Angeles',
  'OR': 'America/Los_Angeles',
  'WA': 'America/Los_Angeles',
  
  // Other
  'AK': 'America/Anchorage',
  'HI': 'Pacific/Honolulu'
}

export function getTimezoneFromState(state?: string): string {
  if (!state) return 'America/New_York' // Default to Eastern
  const normalized = state.toUpperCase().trim()
  return STATE_TIMEZONES[normalized] || 'America/New_York'
}