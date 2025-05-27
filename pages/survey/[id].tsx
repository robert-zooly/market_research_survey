import { useRouter } from 'next/router'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Survey } from 'survey-react-ui'
import { Model } from 'survey-core'
import 'survey-core/survey-core.css'
import { supabase } from '../../lib/supabase'
import { Survey as SurveyType } from '../../types/survey'

// Helper function for safe localStorage operations (Safari/iOS compatibility)
const safeLocalStorage = {
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
      return true
    } catch (e) {
      console.warn('localStorage.setItem failed:', e)
      return false
    }
  },
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key)
    } catch (e) {
      console.warn('localStorage.getItem failed:', e)
      return null
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (e) {
      console.warn('localStorage.removeItem failed:', e)
      return false
    }
  }
}

export default function SurveyPage() {
  const router = useRouter()
  const { id, token } = router.query
  const [surveyData, setSurveyData] = useState<SurveyType | null>(null)
  const [loading, setLoading] = useState(true)
  const [invitationData, setInvitationData] = useState<any>(null)
  const [surveyReady, setSurveyReady] = useState(false)
  const [responseId, setResponseId] = useState<string | null>(null)
  const surveyRef = useRef<Model | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (id) {
      fetchSurvey(id as string)
    }
  }, [id])

  useEffect(() => {
    // Handle invitation token
    if (token && typeof token === 'string') {
      handleInvitationToken(token)
    }
  }, [token])

  const handleInvitationToken = async (invitationToken: string) => {
    try {
      const { getInvitationByToken, markInvitationOpened } = await import('../../lib/invitations')
      const invitation = await getInvitationByToken(invitationToken)
      
      if (invitation) {
        setInvitationData({
          token: invitationToken,
          email: invitation.recipient_email,
          name: invitation.recipient_name,
          ...invitation.recipient_data
        })
        
        // Mark as opened
        await markInvitationOpened(invitationToken)
      }
    } catch (error) {
      console.error('Error handling invitation token:', error)
    }
  }

  const fetchSurvey = async (surveyId: string) => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single()

      if (error) throw error
      setSurveyData(data)
      
      // Create survey model immediately
      const survey = new Model(data.json_schema)
      surveyRef.current = survey
      
      // Enable auto-save on value changes
      survey.onValueChanged.add(handlePartialSave)
      survey.onCurrentPageChanged.add(handlePartialSave)
      
      // Only set loading to false after successful data fetch and survey creation
      setLoading(false)
      setSurveyReady(true)
    } catch (error) {
      console.error('Error fetching survey:', error)
      // Keep loading true during redirect to prevent flash
      alert('Survey not found')
      router.push('/')
    }
  }

  const handlePartialSave = useCallback(async () => {
    if (!surveyRef.current || !id) return
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Debounce saves to avoid too many requests
    saveTimeoutRef.current = setTimeout(async () => {
      const survey = surveyRef.current
      if (!survey) return
      
      const results = survey.data
      const currentPage = survey.currentPageNo
      const totalPages = survey.visiblePageCount
      const completionPercentage = Math.round((currentPage / totalPages) * 100)
      
      const contactData = {
        respondent_email: results.email || invitationData?.email || null,
        respondent_name: results.name || invitationData?.name || null,
        respondent_address: results.address || null
      }
      
      try {
        if (responseId) {
          // Update existing response
          const { error } = await supabase
            .from('survey_responses')
            .update({
              response_data: results,
              ...contactData,
              last_page: currentPage,
              completion_percentage: completionPercentage,
              updated_at: new Date().toISOString()
            })
            .eq('id', responseId)
            
          if (error) throw error
        } else {
          // Create new partial response
          const { data, error } = await supabase
            .from('survey_responses')
            .insert({
              survey_id: id,
              response_data: results,
              ...contactData,
              is_complete: false,
              last_page: currentPage,
              completion_percentage: completionPercentage,
              invitation_token: token || null
            })
            .select('id')
            .single()
            
          if (error) throw error
          if (data) setResponseId(data.id)
        }
      } catch (error) {
        console.error('Error saving partial response:', error)
      }
    }, 2000) // Save after 2 seconds of inactivity
  }, [id, responseId, token, invitationData])

  const onComplete = useCallback(async (sender: Model) => {
    const results = sender.data
    const contactData = {
      respondent_email: results.email || invitationData?.email || null,
      respondent_name: results.name || invitationData?.name || null,
      respondent_address: results.address || null
    }

    try {
      if (responseId) {
        // Update existing response to complete
        const { error } = await supabase
          .from('survey_responses')
          .update({
            response_data: results,
            ...contactData,
            is_complete: true,
            completion_percentage: 100,
            completed_at: new Date().toISOString()
          })
          .eq('id', responseId)
          
        if (error) throw error
      } else {
        // Create new complete response
        const { error } = await supabase
          .from('survey_responses')
          .insert({
            survey_id: id,
            response_data: results,
            ...contactData,
            is_complete: true,
            completion_percentage: 100,
            invitation_token: token || null
          })

        if (error) throw error
      }
      
      // Clear save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      // Mark invitation as completed if present
      if (token && typeof token === 'string') {
        const { markInvitationCompleted } = await import('../../lib/invitations')
        await markInvitationCompleted(token)
      }
      
      // Don't redirect - let the survey show its completion page
    } catch (error) {
      console.error('Error saving response:', error)
      alert('Failed to save response. Please try again.')
    }
  }, [id, responseId, token, invitationData])

  // Set up survey behaviors and invitation data
  useEffect(() => {
    if (!surveyData || !surveyRef.current) return

    const survey = surveyRef.current
    
    // Check if handlers are already attached
    if ((survey as any).__handlersAttached) return
    (survey as any).__handlersAttached = true

    // Handle invitation data
    if (invitationData) {
      survey.data = {
        email: invitationData.email,
        name: invitationData.name,
        ...invitationData,
        _invitation_token: invitationData.token
      }
    }

    // Add custom behavior for checkbox questions with max selections
    survey.onAfterRenderQuestion.add((survey, options) => {
      // Make prepopulated fields read-only if from invitation
      if (invitationData && (options.question.name === 'email' || options.question.name === 'name')) {
        const input = options.htmlElement.querySelector('input')
        if (input) {
          input.readOnly = true
          input.style.backgroundColor = '#f5f5f5'
          input.style.cursor = 'not-allowed'
          
          // Add helper text
          const helper = document.createElement('div')
          helper.style.fontSize = '0.75rem'
          helper.style.color = '#666'
          helper.style.marginTop = '0.25rem'
          helper.textContent = 'This field has been prepopulated from your invitation'
          options.htmlElement.appendChild(helper)
        }
      }
      
    if (options.question.name === 'compelling_benefits') {
      const updateCheckboxState = () => {
        const checkedCount = options.question.value ? options.question.value.length : 0
        const checkboxes = options.htmlElement.querySelectorAll('input[type="checkbox"]')
        
        checkboxes.forEach((checkbox: any) => {
          if (!checkbox.checked && checkedCount >= 2) {
            checkbox.disabled = true
            checkbox.parentElement.style.opacity = '0.5'
            checkbox.parentElement.style.cursor = 'not-allowed'
          } else {
            checkbox.disabled = false
            checkbox.parentElement.style.opacity = '1'
            checkbox.parentElement.style.cursor = 'pointer'
          }
        })

        // Add/update helper text
        let helperText = options.htmlElement.querySelector('.selection-helper') as HTMLDivElement
        if (!helperText) {
          helperText = document.createElement('div')
          helperText.className = 'selection-helper'
          helperText.style.marginTop = '0.5rem'
          helperText.style.fontSize = '0.875rem'
          options.htmlElement.appendChild(helperText)
        }
        
        if (checkedCount === 0) {
          helperText.textContent = 'Please select up to 2 options'
          helperText.style.color = '#666'
        } else if (checkedCount === 1) {
          helperText.textContent = 'You can select 1 more option'
          helperText.style.color = '#0070f3'
        } else if (checkedCount === 2) {
          helperText.textContent = 'Maximum selections reached (2 of 2)'
          helperText.style.color = '#22c55e'
        }
      }

      // Initial state
      updateCheckboxState()

      // Update on change
        options.question.valueChangedCallback = updateCheckboxState
      }
    })

    // Remove all auto-save functionality - only save on complete

    survey.onComplete.add(onComplete)
  }, [surveyData, surveyReady, id, onComplete, invitationData])

  if (loading || !surveyData || !surveyRef.current) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        {loading ? 'Loading survey...' : 'Survey not found. Please check the URL and try again.'}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Survey model={surveyRef.current} />
    </div>
  )
}