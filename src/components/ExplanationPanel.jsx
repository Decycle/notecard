import { useState, useEffect, useRef } from 'react'
import useAuthStore from '../store/useAuthStore'
import { streamExplanationFromChatGPT } from '../services/chatgptService'
import Markdown from 'react-markdown'

export default function ExplanationPanel({
  question,
  isCorrect,
  userAnswer,
}) {
  const [explanation, setExplanation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPanel, setShowPanel] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [isExplaining, setIsExplaining] = useState(false)
  const stopStreamRef = useRef(null)

  // Get the API token from the auth store
  const apiToken = useAuthStore((state) => state.apiToken)
  const hasToken = useAuthStore((state) => state.hasToken())

  // Function to start the streaming process
  const startStreaming = () => {
    if (isExplaining) return // Don't restart if already explaining

    setIsExplaining(true)
    setExplanation('')
    setError(null)
    setIsLoading(true)

    // Abort previous stream if exists
    if (stopStreamRef.current) {
      stopStreamRef.current()
      stopStreamRef.current = null
    }

    if (!hasToken || !apiToken) {
      setError(
        'API token not set. Please set your ChatGPT API token.'
      )
      setIsLoading(false)
      return
    }

    try {
      // Start streaming the explanation
      stopStreamRef.current = streamExplanationFromChatGPT(
        apiToken,
        {
          title: question.title,
          answers: question.answers,
          isCorrect,
          userAnswer,
        },
        // Handle each chunk
        (chunk) => {
          setExplanation((prev) => prev + chunk)
        },
        // Handle errors
        (errorMessage) => {
          console.error('Streaming error:', errorMessage)
          setError(errorMessage)
          setIsLoading(false)
          stopStreamRef.current = null
        },
        // Handle completion
        () => {
          setIsLoading(false)
          stopStreamRef.current = null
        }
      )
    } catch (err) {
      console.error('Failed to start streaming:', err)
      setError(
        `Failed to start explanation: ${
          err.message || 'Unknown error'
        }`
      )
      setIsLoading(false)
    }
  }

  // Handle retrying when there's an error
  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    startStreaming()
  }

  useEffect(() => {
    // Reset state when question changes
    setExplanation('')
    setError(null)
    setIsExplaining(false)
    setIsLoading(false)

    // Cleanup function to abort stream if component unmounts
    return () => {
      if (stopStreamRef.current) {
        stopStreamRef.current()
        stopStreamRef.current = null
      }
    }
  }, [
    question.id,
    apiToken,
    hasToken,
    isCorrect,
    userAnswer,
  ])

  const togglePanel = () => {
    setShowPanel(!showPanel)
  }

  return (
    <div className='mt-4 border rounded-lg overflow-hidden bg-white'>
      <div
        className='bg-indigo-100 p-3 flex justify-between items-center cursor-pointer border-b'
        onClick={togglePanel}>
        <h3 className='font-medium text-indigo-800 flex items-center'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5 mr-2'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          Explanation
        </h3>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className={`h-5 w-5 transition-transform ${
            showPanel ? 'transform rotate-180' : ''
          }`}
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M19 9l-7 7-7-7'
          />
        </svg>
      </div>

      {showPanel && (
        <div className='p-4'>
          {!hasToken && (
            <div className='bg-yellow-50 border border-yellow-200 p-3 rounded-md text-yellow-800 mb-3'>
              <p className='font-medium'>
                No API token set
              </p>
              <p className='text-sm mt-1'>
                Please set your ChatGPT API token to see
                explanations for quiz questions.
              </p>
            </div>
          )}

          {error && (
            <div className='bg-red-50 border border-red-200 p-3 rounded-md text-red-800 mb-3'>
              <p className='font-medium'>
                Error loading explanation
              </p>
              <p className='text-sm mt-1'>{error}</p>
              {retryCount < 3 && (
                <button
                  onClick={handleRetry}
                  className='mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 text-sm font-medium'>
                  Retry
                </button>
              )}
            </div>
          )}

          {!isExplaining && hasToken && (
            <div className='flex justify-center my-2'>
              <button
                onClick={startStreaming}
                className='px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-5 w-5 mr-2'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
                  />
                </svg>
                Explain Answer
              </button>
            </div>
          )}

          {/* Display explanation text as it's streaming */}
          {isExplaining && !error && (
            <div className='prose prose-sm max-w-none text-left'>
              {explanation && (
                <Markdown>{explanation}</Markdown>
              )}

              {/* Show loading indicator at the bottom of text while streaming */}
              {isLoading && (
                <div className='flex items-center mt-2 text-gray-500 text-sm'>
                  <div className='mr-2 relative h-2 w-2'>
                    <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75'></span>
                    <span className='relative inline-flex rounded-full h-2 w-2 bg-indigo-500'></span>
                  </div>
                  <span>Generating explanation...</span>
                </div>
              )}
            </div>
          )}

          {!isLoading &&
            !error &&
            explanation === '' &&
            isExplaining &&
            hasToken && (
              <div className='text-gray-500 text-center p-4'>
                No explanation available. Try refreshing the
                page.
              </div>
            )}
        </div>
      )}
    </div>
  )
}
