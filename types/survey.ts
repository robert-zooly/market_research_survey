export interface Survey {
  id: string
  name: string
  description: string
  json_schema: any
  created_at: string
  is_active: boolean
}

export interface SurveyResponse {
  id: string
  survey_id: string
  response_data: any
  respondent_email?: string
  respondent_name?: string
  respondent_address?: string
  created_at: string
}