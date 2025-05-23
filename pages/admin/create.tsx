import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import marketResearchSurvey from '../../surveys/market-research.json'
import hipReplacementSurvey from '../../surveys/hip-replacement-assessment.json'

export default function CreateSurvey() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('market-research')
  const [jsonSchema, setJsonSchema] = useState(JSON.stringify(marketResearchSurvey, null, 2))
  const [loading, setLoading] = useState(false)

  const templates = {
    'market-research': { name: 'Market Research Survey', data: marketResearchSurvey },
    'hip-replacement': { name: 'Hip Replacement Innovation Assessment', data: hipReplacementSurvey }
  }

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey)
    const template = templates[templateKey as keyof typeof templates]
    setJsonSchema(JSON.stringify(template.data, null, 2))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate JSON
      const parsedSchema = JSON.parse(jsonSchema)

      const { error } = await supabase
        .from('surveys')
        .insert({
          name,
          description,
          json_schema: parsedSchema,
          is_active: true
        })

      if (error) throw error
      router.push('/admin')
    } catch (error) {
      console.error('Error creating survey:', error)
      if (error instanceof SyntaxError) {
        alert('Invalid JSON format')
      } else {
        alert('Failed to create survey')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>Create New Survey</h1>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Survey Name:
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ 
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Survey Template:
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            style={{ 
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="market-research">Market Research Survey</option>
            <option value="hip-replacement">Hip Replacement Innovation Assessment</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Description:
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            style={{ 
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Survey JSON Schema (SurveyJS format):
          </label>
          <textarea
            value={jsonSchema}
            onChange={(e) => setJsonSchema(e.target.value)}
            required
            rows={20}
            style={{ 
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}
          />
          <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            Tip: Select a template above or modify the JSON directly. You can also replace it with your own schema.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            disabled={loading}
            style={{ 
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Creating...' : 'Create Survey'}
          </button>
          
          <Link 
            href="/admin"
            style={{ 
              padding: '0.75rem 1.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              textDecoration: 'none',
              color: '#333'
            }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}