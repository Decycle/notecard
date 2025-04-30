import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'
// @ts-expect-error - Importing JSX file in TypeScript
import QuestionCard from './components/QuestionCard'
import { useQuizStore } from './store'
import ApiTokenModal from './components/ApiTokenModal'
import useAuthStore from './store/useAuthStore'

interface Answer {
  title: string
  type: string
  correct: string
}

interface Question {
  id: string
  title: string
  description: string
  answers: Answer[]
  explanation: string
}

// Define the types for our store selectors
interface QuizState {
  answerHistory: Record<
    string,
    Array<{ timestamp: number; isCorrect: boolean }>
  >
  addQuestionResult: (
    questionId: string,
    isCorrect: boolean
  ) => void
  resetScores: () => void
  getQuestionStats: (questionId: string) => {
    totalAttempts: number
    correctAttempts: number
    correctRate: number
    lastAttempt?: { timestamp: number; isCorrect: boolean }
  }
}

function App() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] =
    useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [showTokenModal, setShowTokenModal] =
    useState(false)
  const navigate = useNavigate()

  // Auth store
  const hasToken = useAuthStore((state) => state.hasToken())

  // Use the Zustand store with stable selectors to prevent infinite loops
  const addQuestionResult = useQuizStore(
    (state: QuizState) => state.addQuestionResult
  )
  const resetScores = useQuizStore(
    (state: QuizState) => state.resetScores
  )

  // Get the stats directly from the answerHistory
  const answerHistory = useQuizStore(
    (state: QuizState) => state.answerHistory
  )

  // Calculate overall stats
  const answeredQuestionIds = Object.keys(answerHistory)
  const totalAnswered = answeredQuestionIds.length

  // Get latest result for each question
  const correctCount = answeredQuestionIds.reduce(
    (count, questionId) => {
      const attempts = answerHistory[questionId]
      // Get the most recent attempt and check if it's correct
      return attempts.length > 0 &&
        attempts[attempts.length - 1].isCorrect
        ? count + 1
        : count
    },
    0
  )

  // Load all questions from the JSON file
  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true)
      try {
        // Use relative path that works with base URL
        const response = await fetch('./question.json')
        const data = await response.json()
        setQuestions(data)
        setError(null)
        // Load a random question once we have the data
        if (data.length > 0) {
          selectWeightedRandomQuestion(data)
        } else {
          setError(
            'No questions found in the question file.'
          )
        }
      } catch (err) {
        console.error('Error loading questions:', err)
        setError(
          'Failed to load questions. Please try again.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [])

  // Add a new effect to refresh when navigating back from stats page
  // This will be triggered when the component mounts or remounts
  useEffect(() => {
    // If we already have questions loaded but no current question
    if (questions.length > 0 && !currentQuestion) {
      selectWeightedRandomQuestion()
    }
  }, [questions, currentQuestion])

  // Select a weighted random question giving higher chance to questions with lower success rates
  const selectWeightedRandomQuestion = (
    questionList = questions
  ) => {
    if (questionList.length === 0) return

    // Get the question stats for weighting
    const questionWeights = questionList.map((question) => {
      // Get attempts data for this question
      const attempts = answerHistory[question.id] || []

      // Calculate unbiased success rate: (success_count + 1) / (total_count + 2)
      const successCount =
        attempts.filter((a) => a.isCorrect).length + 1
      const totalCount = attempts.length + 2
      const unbiasedSuccessRate = successCount / totalCount

      // Weight is inverse of success rate - lower success rate means higher weight
      // We subtract from 1 to invert the value
      const weight = 1 - unbiasedSuccessRate

      return {
        question,
        weight,
      }
    })

    // Sum all weights
    const totalWeight = questionWeights.reduce(
      (sum, item) => sum + item.weight,
      0
    )

    // Select a random point in the weight space
    let randomPoint = Math.random() * totalWeight

    // Find the question at this point
    let selectedQuestion = questionList[0] // Default to first question if something fails

    for (const item of questionWeights) {
      randomPoint -= item.weight
      if (randomPoint <= 0) {
        selectedQuestion = item.question
        break
      }
    }

    setCurrentQuestion(selectedQuestion)
  }

  // Use weighted selection for the next question instead of pure random
  const handleNextQuestion = () => {
    selectWeightedRandomQuestion()
  }

  const handleAnswerSubmit = (
    questionId: string,
    isCorrect: boolean
  ) => {
    // Add to answer history
    addQuestionResult(questionId, isCorrect)
  }

  const handleResetScores = () => {
    if (resetConfirm) {
      resetScores()
      setResetConfirm(false)
    } else {
      setResetConfirm(true)
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setResetConfirm(false), 3000)
    }
  }

  const handleScoreClick = () => {
    // Reset current question before navigating
    // This will help trigger a refresh when coming back
    setCurrentQuestion(null)
    navigate('/stats')
  }

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      <header className='w-full py-3 px-4 flex justify-between items-center border-b border-gray-200 bg-white shadow-sm sticky top-0 z-10'>
        <h1 className='text-2xl font-bold'>Quiz App</h1>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => setShowTokenModal(true)}
            className='px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center'
            title={
              hasToken
                ? 'Change API Token'
                : 'Set ChatGPT API Token'
            }>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-4 w-4 mr-1'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
              />
            </svg>
            <span className='text-sm'>
              {hasToken ? 'API Token' : 'Set API Token'}
            </span>
          </button>

          <div
            className='bg-blue-50 px-3 py-1 rounded-lg font-medium cursor-pointer hover:bg-blue-100 transition-colors flex items-center gap-1 border border-blue-200'
            onClick={handleScoreClick}
            title='View detailed statistics'>
            <span>Score: </span>
            <span className='font-bold text-blue-600'>
              {correctCount}
            </span>
            <span> / {totalAnswered}</span>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-4 w-4 text-blue-500 ml-1'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 5l7 7-7 7'
              />
            </svg>
          </div>
          {totalAnswered > 0 && (
            <button
              onClick={handleResetScores}
              className={`px-2 py-1 rounded text-sm ${
                resetConfirm
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}>
              {resetConfirm ? 'Confirm Reset' : 'Reset'}
            </button>
          )}
        </div>
      </header>

      <main className='flex-1 overflow-y-auto py-4 bg-gray-100'>
        <div className='w-full max-w-xl px-4 mx-auto'>
          {loading ? (
            <div className='text-xl text-center'>
              Loading questions...
            </div>
          ) : error ? (
            <div className='text-red-500 text-center'>
              {error}
            </div>
          ) : (
            currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                onNext={handleNextQuestion}
                onAnswerSubmit={handleAnswerSubmit}
              />
            )
          )}
        </div>
      </main>

      <ApiTokenModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
      />
    </div>
  )
}

export default App
