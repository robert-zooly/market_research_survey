import {
  getNext9amInTimezone,
  getTimezoneOffsetHours,
  scheduleByTimezone,
  shouldSendNow,
  getTimeUntilSend,
  formatTimezoneName
} from '../../lib/timezone-scheduler'
import { SurveyInvitation } from '../../types/invitation'

describe('timezone-scheduler', () => {
  describe('getNext9amInTimezone', () => {
    it('should return 9am in the target timezone', () => {
      // Mock current time as 8am EST
      const mockDate = new Date('2024-01-15T08:00:00-05:00')
      const result = getNext9amInTimezone('America/New_York', mockDate)
      
      // Verify it's set to 9:00:00
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
      expect(result.getMilliseconds()).toBe(0)
      
      // Verify it's the correct day (today since it's before 9am)
      const hourInTimezone = parseInt(result.toLocaleString('en-US', { 
        timeZone: 'America/New_York', 
        hour: 'numeric', 
        hour12: false 
      }))
      expect(hourInTimezone).toBe(9)
    })

    it('should return next day 9am if current time is after 9am', () => {
      // Mock current time as 10am EST
      const mockDate = new Date('2024-01-15T10:00:00-05:00')
      const result = getNext9amInTimezone('America/New_York', mockDate)
      
      // Should be tomorrow
      const dayDiff = result.getDate() - mockDate.getDate()
      expect(dayDiff).toBe(1)
      
      // Verify it's 9am in the timezone
      const hourInTimezone = parseInt(result.toLocaleString('en-US', { 
        timeZone: 'America/New_York', 
        hour: 'numeric', 
        hour12: false 
      }))
      expect(hourInTimezone).toBe(9)
    })

    it('should handle different timezones correctly', () => {
      const mockDate = new Date('2024-01-15T10:00:00-05:00')
      
      const pstResult = getNext9amInTimezone('America/Los_Angeles', mockDate)
      const estResult = getNext9amInTimezone('America/New_York', mockDate)
      
      // Both should be at 9am in their respective timezones
      const pstHour = parseInt(pstResult.toLocaleString('en-US', { 
        timeZone: 'America/Los_Angeles', 
        hour: 'numeric', 
        hour12: false 
      }))
      const estHour = parseInt(estResult.toLocaleString('en-US', { 
        timeZone: 'America/New_York', 
        hour: 'numeric', 
        hour12: false 
      }))
      
      expect(pstHour).toBe(9)
      expect(estHour).toBe(9)
    })
  })

  describe('getTimezoneOffsetHours', () => {
    it('should return correct offsets for standard time', () => {
      // Test during winter (no DST)
      const originalDate = global.Date
      global.Date = class extends originalDate {
        getMonth() { return 0 } // January
      } as any

      expect(getTimezoneOffsetHours('America/New_York')).toBe(-5)
      expect(getTimezoneOffsetHours('America/Chicago')).toBe(-6)
      expect(getTimezoneOffsetHours('America/Denver')).toBe(-7)
      expect(getTimezoneOffsetHours('America/Los_Angeles')).toBe(-8)
      expect(getTimezoneOffsetHours('America/Phoenix')).toBe(-7) // No DST

      global.Date = originalDate
    })

    it('should return correct offsets for daylight saving time', () => {
      // Test during summer (DST)
      const originalDate = global.Date
      global.Date = class extends originalDate {
        getMonth() { return 6 } // July
      } as any

      expect(getTimezoneOffsetHours('America/New_York')).toBe(-4)
      expect(getTimezoneOffsetHours('America/Chicago')).toBe(-5)
      expect(getTimezoneOffsetHours('America/Denver')).toBe(-6)
      expect(getTimezoneOffsetHours('America/Los_Angeles')).toBe(-7)
      expect(getTimezoneOffsetHours('America/Phoenix')).toBe(-7) // No DST

      global.Date = originalDate
    })
  })

  describe('scheduleByTimezone', () => {
    const mockInvitations: SurveyInvitation[] = [
      {
        id: '1',
        token: 'token1',
        batch_id: 'batch1',
        survey_id: 'survey1',
        recipient_email: 'test1@example.com',
        timezone: 'America/New_York',
        reminder_count: 0,
        created_at: '2024-01-01'
      },
      {
        id: '2',
        token: 'token2',
        batch_id: 'batch1',
        survey_id: 'survey1',
        recipient_email: 'test2@example.com',
        timezone: 'America/Los_Angeles',
        reminder_count: 0,
        created_at: '2024-01-01'
      },
      {
        id: '3',
        token: 'token3',
        batch_id: 'batch1',
        survey_id: 'survey1',
        recipient_email: 'test3@example.com',
        timezone: 'America/New_York',
        reminder_count: 0,
        created_at: '2024-01-01'
      },
      {
        id: '4',
        token: 'token4',
        batch_id: 'batch1',
        survey_id: 'survey1',
        recipient_email: 'unsubscribed@example.com',
        timezone: 'America/New_York',
        reminder_count: 0,
        created_at: '2024-01-01',
        unsubscribed_at: '2024-01-02'
      }
    ]

    it('should group invitations by timezone', () => {
      const result = scheduleByTimezone(mockInvitations)
      
      expect(result).toHaveLength(2) // Only 2 timezones (unsubscribed filtered out)
      expect(result[0].timezone).toBe('America/New_York')
      expect(result[0].invitations).toHaveLength(2) // 2 active in NY
      expect(result[1].timezone).toBe('America/Los_Angeles')
      expect(result[1].invitations).toHaveLength(1)
    })

    it('should filter out unsubscribed invitations', () => {
      const result = scheduleByTimezone(mockInvitations)
      
      const allInvitations = result.flatMap(batch => batch.invitations)
      const unsubscribedInvitation = allInvitations.find(
        inv => inv.recipient_email === 'unsubscribed@example.com'
      )
      
      expect(unsubscribedInvitation).toBeUndefined()
    })

    it('should sort batches by scheduled time (east to west)', () => {
      const result = scheduleByTimezone(mockInvitations)
      
      // Eastern time should come before Pacific time
      expect(result[0].timezone).toBe('America/New_York')
      expect(result[1].timezone).toBe('America/Los_Angeles')
      expect(result[0].scheduledTime.getTime()).toBeLessThan(
        result[1].scheduledTime.getTime()
      )
    })

    it('should set default timezone for invitations without timezone', () => {
      const invitationsWithoutTz: SurveyInvitation[] = [{
        id: '5',
        token: 'token5',
        batch_id: 'batch1',
        survey_id: 'survey1',
        recipient_email: 'test5@example.com',
        reminder_count: 0,
        created_at: '2024-01-01'
        // No timezone specified
      }]

      const result = scheduleByTimezone(invitationsWithoutTz)
      
      expect(result[0].timezone).toBe('America/New_York') // Default
    })
  })

  describe('shouldSendNow', () => {
    it('should return true if scheduled time has passed', () => {
      const scheduledTime = new Date('2024-01-15T09:00:00')
      const currentTime = new Date('2024-01-15T09:01:00')
      
      expect(shouldSendNow(scheduledTime, currentTime)).toBe(true)
    })

    it('should return false if scheduled time has not passed', () => {
      const scheduledTime = new Date('2024-01-15T09:00:00')
      const currentTime = new Date('2024-01-15T08:59:00')
      
      expect(shouldSendNow(scheduledTime, currentTime)).toBe(false)
    })

    it('should return true if times are exactly equal', () => {
      const time = new Date('2024-01-15T09:00:00')
      
      expect(shouldSendNow(time, time)).toBe(true)
    })
  })

  describe('getTimeUntilSend', () => {
    it('should return "Ready to send" if time has passed', () => {
      const scheduledTime = new Date('2024-01-15T09:00:00')
      const currentTime = new Date('2024-01-15T09:01:00')
      
      expect(getTimeUntilSend(scheduledTime, currentTime)).toBe('Ready to send')
    })

    it('should format minutes correctly', () => {
      const scheduledTime = new Date('2024-01-15T09:30:00')
      const currentTime = new Date('2024-01-15T09:00:00')
      
      expect(getTimeUntilSend(scheduledTime, currentTime)).toBe('30m')
    })

    it('should format hours and minutes correctly', () => {
      const scheduledTime = new Date('2024-01-15T11:30:00')
      const currentTime = new Date('2024-01-15T09:00:00')
      
      expect(getTimeUntilSend(scheduledTime, currentTime)).toBe('2h 30m')
    })

    it('should format days, hours and minutes correctly', () => {
      const scheduledTime = new Date('2024-01-17T11:30:00')
      const currentTime = new Date('2024-01-15T09:00:00')
      
      expect(getTimeUntilSend(scheduledTime, currentTime)).toBe('2d 2h 30m')
    })
  })

  describe('formatTimezoneName', () => {
    it('should format US timezone names correctly', () => {
      expect(formatTimezoneName('America/New_York')).toBe('Eastern')
      expect(formatTimezoneName('America/Chicago')).toBe('Central')
      expect(formatTimezoneName('America/Denver')).toBe('Mountain')
      expect(formatTimezoneName('America/Phoenix')).toBe('Arizona')
      expect(formatTimezoneName('America/Los_Angeles')).toBe('Pacific')
      expect(formatTimezoneName('America/Anchorage')).toBe('Alaska')
      expect(formatTimezoneName('Pacific/Honolulu')).toBe('Hawaii')
    })

    it('should return original name for unknown timezones', () => {
      expect(formatTimezoneName('Europe/London')).toBe('Europe/London')
      expect(formatTimezoneName('Asia/Tokyo')).toBe('Asia/Tokyo')
    })
  })
})