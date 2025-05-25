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
  const [responseId, setResponseId] = useState<string | null>(null)
  const [lastSavedData, setLastSavedData] = useState<any>(null)
  const [lastPageIndex, setLastPageIndex] = useState<number>(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const [invitationData, setInvitationData] = useState<any>(null)
  const surveyRef = useRef<Model | null>(null)

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

      // Load saved data from localStorage with Safari/iOS compatibility
      const savedData = safeLocalStorage.getItem(`survey_${surveyId}_data`)
      const savedResponseId = safeLocalStorage.getItem(`survey_${surveyId}_response_id`)
      const savedPageIndex = safeLocalStorage.getItem(`survey_${surveyId}_page`)
      
      if (savedData) {
        try {
          setLastSavedData(JSON.parse(savedData))
        } catch (e) {
          console.warn('Failed to parse saved data:', e)
        }
      }
      if (savedResponseId) {
        setResponseId(savedResponseId)
      }
      if (savedPageIndex) {
        setLastPageIndex(parseInt(savedPageIndex))
      }
    } catch (error) {
      console.error('Error fetching survey:', error)
      alert('Survey not found')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const savePartialResponse = useCallback(async (data: any) => {
    const contactData = {
      respondent_email: data.email || null,
      respondent_name: data.name || null,
      respondent_address: data.address || null
    }

    try {
      if (responseId) {
        // Update existing response
        const { error } = await supabase
          .from('survey_responses')
          .update({
            response_data: data,
            ...contactData,
            is_complete: false
          })
          .eq('id', responseId)

        if (error) throw error
      } else {
        // Create new partial response
        const { data: newResponse, error } = await supabase
          .from('survey_responses')
          .insert({
            survey_id: id,
            response_data: data,
            ...contactData,
            is_complete: false
          })
          .select()
          .single()

        if (error) throw error
        if (newResponse) {
          setResponseId(newResponse.id)
          safeLocalStorage.setItem(`survey_${id}_response_id`, newResponse.id)
        }
      }
    } catch (error) {
      console.error('Error saving partial response:', error)
    }
  }, [id, responseId])

  const onComplete = useCallback(async (sender: Model) => {
    const results = sender.data
    const contactData = {
      respondent_email: results.email || null,
      respondent_name: results.name || null,
      respondent_address: results.address || null
    }

    try {
      if (responseId) {
        // Update existing response to mark as complete
        const { error } = await supabase
          .from('survey_responses')
          .update({
            response_data: results,
            ...contactData,
            is_complete: true
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
            is_complete: true
          })

        if (error) throw error
      }

      // Clear local storage
      safeLocalStorage.removeItem(`survey_${id}_data`)
      safeLocalStorage.removeItem(`survey_${id}_response_id`)
      safeLocalStorage.removeItem(`survey_${id}_page`)
      
      // Don't redirect - let the survey show its completion page
    } catch (error) {
      console.error('Error saving response:', error)
      alert('Failed to save response. Please try again.')
    }
  }, [id, responseId, router])

  // Create survey model only once
  useEffect(() => {
    if (!surveyData || surveyRef.current) return

    const survey = new Model(surveyData.json_schema)
    surveyRef.current = survey

    // Restore saved data if available
    if (lastSavedData) {
      survey.data = lastSavedData
    } else if (invitationData) {
      // Prepopulate from invitation data
      survey.data = {
        email: invitationData.email,
        name: invitationData.name,
        ...invitationData
      }
      // Store the invitation token for tracking
      survey.data._invitation_token = invitationData.token
    }

    // Restore last page if available
    if (lastPageIndex > 0) {
      survey.currentPageNo = lastPageIndex
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

    // Auto-save on value change
    survey.onValueChanged.add((sender, options) => {
      // Skip auto-save during initialization
      if (!isInitialized) return
      
      const currentData = sender.data
      
      // Save to localStorage
      safeLocalStorage.setItem(`survey_${id}_data`, JSON.stringify(currentData))
      
      // Debounced save to database (every 5 seconds of changes)
      if (survey.onValueChanged.hasOwnProperty('timeoutId')) {
        clearTimeout((survey.onValueChanged as any).timeoutId)
      }
      
      (survey.onValueChanged as any).timeoutId = setTimeout(() => {
        if (isInitialized) {
          savePartialResponse(currentData)
        }
      }, 5000)
    })

    // Save on page change
    survey.onCurrentPageChanged.add((sender) => {
      // Skip during initial page setup
      if (!isInitialized) {
        setIsInitialized(true)
        return
      }
      
      const currentData = sender.data
      const currentPageIndex = sender.currentPageNo
      
      safeLocalStorage.setItem(`survey_${id}_data`, JSON.stringify(currentData))
      safeLocalStorage.setItem(`survey_${id}_page`, currentPageIndex.toString())
      
      // Only save to database if we have actual data
      if (currentData && Object.keys(currentData).length > 0) {
        savePartialResponse(currentData)
      }
    })

    survey.onComplete.add(onComplete)

    // Mark as initialized after first render
    setTimeout(() => setIsInitialized(true), 500)
  }, [surveyData, id, savePartialResponse, onComplete, invitationData]) // Include stable dependencies

  if (loading) return <div>Loading survey...</div>
  if (!surveyData || !surveyRef.current) return <div>Survey not found</div>

  return (
    <div style={{ minHeight: '100vh' }}>
      <Survey model={surveyRef.current} />
      <div style={{ 
        position: 'fixed', 
        bottom: '10px', 
        right: '10px', 
        fontSize: '12px', 
        color: '#666',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '5px 10px',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        Your progress is automatically saved
      </div>
    </div>
  )
}