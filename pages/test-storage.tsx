import { useState, useEffect } from 'react'

export default function TestStorage() {
  const [localStorageAvailable, setLocalStorageAvailable] = useState<boolean | null>(null)
  const [testResult, setTestResult] = useState<string>('')
  const [userAgent, setUserAgent] = useState<string>('')

  useEffect(() => {
    // Get user agent
    setUserAgent(navigator.userAgent)

    // Test localStorage availability
    try {
      const testKey = '__test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      setLocalStorageAvailable(true)
      
      // Test actual survey storage
      const surveyKey = 'survey_test_data'
      const testData = { test: 'value', timestamp: new Date().toISOString() }
      localStorage.setItem(surveyKey, JSON.stringify(testData))
      const retrieved = localStorage.getItem(surveyKey)
      
      if (retrieved) {
        const parsed = JSON.parse(retrieved)
        setTestResult(`Success! Stored and retrieved: ${JSON.stringify(parsed)}`)
        localStorage.removeItem(surveyKey)
      }
    } catch (e) {
      setLocalStorageAvailable(false)
      setTestResult(`Failed: ${e}`)
    }
  }, [])

  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent)
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>localStorage Test Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Browser Info:</h3>
        <p>User Agent: {userAgent}</p>
        <p>Is Safari: {isSafari ? 'Yes' : 'No'}</p>
        <p>Is iOS: {isIOS ? 'Yes' : 'No'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>localStorage Status:</h3>
        <p>Available: {localStorageAvailable === null ? 'Testing...' : localStorageAvailable ? 'Yes' : 'No'}</p>
        <p>Test Result: {testResult}</p>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h3>Troubleshooting Safari/iOS:</h3>
        <ul>
          <li>Make sure you're not in Private Browsing mode</li>
          <li>Check Settings → Safari → Advanced → Website Data</li>
          <li>Try clearing website data for this site</li>
          <li>Ensure cookies are enabled</li>
        </ul>
      </div>

      <div>
        <h3>Next Steps:</h3>
        <p>If localStorage is not available, the survey will still save to the server every 5 seconds.</p>
        <p><a href="/">Go back to surveys</a></p>
      </div>
    </div>
  )
}