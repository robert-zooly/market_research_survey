import { supabase } from './supabase'
import { CSVRow, SurveyInvitation, InvitationBatch, getTimezoneFromState } from '../types/invitation'
import { customAlphabet } from 'nanoid'

// Create URL-safe token generator
const generateToken = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 32)

export async function createInvitationBatch(name: string, csvData: any): Promise<InvitationBatch> {
  const { data, error } = await supabase
    .from('invitation_batches')
    .insert({
      name,
      csv_data: csvData,
      total_count: csvData.length
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createInvitations(
  batchId: string,
  surveyId: string,
  rows: CSVRow[]
): Promise<SurveyInvitation[]> {
  const invitations = rows.map(row => ({
    token: generateToken(),
    batch_id: batchId,
    survey_id: surveyId,
    recipient_email: row.email.toLowerCase().trim(),
    recipient_name: row.name?.trim(),
    recipient_state: row.state?.trim(),
    recipient_data: row,
    timezone: getTimezoneFromState(row.state)
  }))

  const { data, error } = await supabase
    .from('survey_invitations')
    .insert(invitations)
    .select()

  if (error) throw error
  return data
}

export async function getInvitationByToken(token: string): Promise<SurveyInvitation | null> {
  const { data, error } = await supabase
    .from('survey_invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (error) return null
  return data
}

export async function markInvitationOpened(token: string): Promise<void> {
  const { error } = await supabase
    .from('survey_invitations')
    .update({ opened_at: new Date().toISOString() })
    .eq('token', token)
    .is('opened_at', null)

  if (error) throw error
}

export async function markInvitationSent(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('survey_invitations')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', invitationId)

  if (error) throw error
}

export async function getInvitationBatches(): Promise<InvitationBatch[]> {
  const { data, error } = await supabase
    .from('invitation_batches')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getInvitationsByBatch(batchId: string): Promise<SurveyInvitation[]> {
  const { data, error } = await supabase
    .from('survey_invitations')
    .select('*')
    .eq('batch_id', batchId)
    .order('recipient_email')

  if (error) throw error
  return data
}

export async function getPendingInvitations(batchId: string): Promise<SurveyInvitation[]> {
  const { data, error } = await supabase
    .from('survey_invitations')
    .select('*')
    .eq('batch_id', batchId)
    .is('sent_at', null)
    .order('timezone')

  if (error) throw error
  return data
}

export async function getInvitationsForFollowUp(
  batchId: string,
  daysSinceSent: number
): Promise<SurveyInvitation[]> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceSent)

  const { data, error } = await supabase
    .from('survey_invitations')
    .select('*')
    .eq('batch_id', batchId)
    .not('sent_at', 'is', null)
    .is('completed_at', null)
    .lte('sent_at', cutoffDate.toISOString())
    .order('timezone')

  if (error) throw error
  return data
}