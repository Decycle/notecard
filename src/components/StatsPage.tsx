import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuizStore } from '../store'

interface Question {
  id: string
  title: string
}

interface QuestionAttempt {
  timestamp: number
  isCorrect: boolean
}

interface QuestionStats {
  id: string
  title: string
  totalAttempts: number
  correctAttempts: number
  correctRate: number
  attempts: QuestionAttempt[]
}

// Define sort options
type SortField = 'title' | 'attempts' | 'successRate'
type SortDirection = 'asc' | 'desc'

const StatsPage = () => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionStats, setQuestionStats] = useState<
    QuestionStats[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const navigate = useNavigate()

  // Sorting state
  const [sortField, setSortField] =
    useState<SortField>('title')
  const [sortDirection, setSortDirection] =
    useState<SortDirection>('asc')

  // Get the answer history from our store
  const answerHistory = useQuizStore(
    (state) => state.answerHistory
  )
  const resetScores = useQuizStore(
    (state) => state.resetScores
  )
  const getQuestionStats = useQuizStore(
    (state) => state.getQuestionStats
  )

  // Calculate overall stats with useMemo to prevent recalculation on every render
  const {
    answeredQuestionIds,
    uniqueQuestionsAnswered,
    totalAttempts,
    totalCorrectAttempts,
    overallCorrectRate,
  } = useMemo(() => {
    // Get unique question IDs
    const ids = Object.keys(answerHistory)

    // Count all attempts across all questions
    const attemptCount = Object.values(
      answerHistory
    ).reduce((sum, attempts) => sum + attempts.length, 0)

    // Count all correct attempts across all questions
    const correctCount = Object.values(
      answerHistory
    ).reduce(
      (sum, attempts) =>
        sum + attempts.filter((a) => a.isCorrect).length,
      0
    )

    // Calculate overall success rate
    const rate =
      attemptCount > 0
        ? Math.round((correctCount / attemptCount) * 100)
        : 0

    return {
      answeredQuestionIds: ids,
      uniqueQuestionsAnswered: ids.length,
      totalAttempts: attemptCount,
      totalCorrectAttempts: correctCount,
      overallCorrectRate: rate,
    }
  }, [answerHistory])

  // Load questions to get titles
  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true)
      try {
        // Use relative path that works with base URL
        const response = await fetch('./question.json')
        const data = await response.json()
        setQuestions(data)
        setTotalQuestions(data.length)
        setError(null)
      } catch (err) {
        console.error('Error loading questions:', err)
        setError(
          'Failed to load questions. Stats may be incomplete.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [])

  // Process question stats when questions or answer history changes
  useEffect(() => {
    if (
      questions.length > 0 &&
      answeredQuestionIds.length > 0
    ) {
      // Create a map to ensure each question ID is only processed once
      const processedQuestionIds = new Set<string>()

      const stats: QuestionStats[] = answeredQuestionIds
        .map((id) => {
          // Skip if we've already processed this ID
          if (processedQuestionIds.has(id)) return null

          const question = questions.find(
            (q) => q.id === id
          )
          if (!question) return null

          // Mark this ID as processed
          processedQuestionIds.add(id)

          const attempts = answerHistory[id]
          // Only count each question once for stats
          const {
            totalAttempts,
            correctAttempts,
            correctRate,
          } = getQuestionStats(id)

          return {
            id,
            title: question.title,
            totalAttempts,
            correctAttempts,
            correctRate,
            attempts,
          }
        })
        .filter(
          (stat): stat is QuestionStats => stat !== null
        )
        // Initial sort by most recent attempt
        .sort((a, b) => {
          const aLatestTime =
            a.attempts.length > 0
              ? a.attempts[a.attempts.length - 1].timestamp
              : 0
          const bLatestTime =
            b.attempts.length > 0
              ? b.attempts[b.attempts.length - 1].timestamp
              : 0
          return bLatestTime - aLatestTime
        })

      console.log(
        'Question stats processed:',
        stats.length,
        'unique questions'
      )
      setQuestionStats(stats)
    }
  }, [
    questions,
    answerHistory,
    getQuestionStats,
    answeredQuestionIds,
  ])

  // Handle reset confirmation
  const [resetConfirm, setResetConfirm] = useState(false)

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

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleBackToQuiz = () => {
    navigate('/')
  }

  // Helper function to get color based on success rate
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 text-green-800'
    if (rate >= 60) return 'bg-green-50 text-green-700'
    if (rate >= 40) return 'bg-yellow-100 text-yellow-800'
    if (rate >= 20) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  // Function to handle column sort
  const handleSort = (field: SortField) => {
    // If clicking the same field, toggle direction
    if (field === sortField) {
      setSortDirection(
        sortDirection === 'asc' ? 'desc' : 'asc'
      )
    } else {
      // If new field, set it with default ascending direction
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Get sorted question stats
  const sortedQuestionStats = useMemo(() => {
    return [...questionStats].sort((a, b) => {
      // Determine sort order based on field and direction
      let comparison = 0

      if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title)
      } else if (sortField === 'attempts') {
        comparison = a.totalAttempts - b.totalAttempts
      } else if (sortField === 'successRate') {
        comparison = a.correctRate - b.correctRate
      }

      return sortDirection === 'asc'
        ? comparison
        : -comparison
    })
  }, [questionStats, sortField, sortDirection])

  // Helper function to render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null

    return (
      <span className='ml-1'>
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  return (
    <div className='h-full bg-gray-100 flex flex-col overflow-hidden'>
      <header className='w-full py-3 px-4 flex justify-between items-center border-b border-gray-200 bg-white shadow-sm'>
        <h1 className='text-2xl font-bold'>Stats</h1>
        <div className='flex items-center gap-3'>
          <button
            onClick={handleBackToQuiz}
            className='px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600'>
            Back to Quiz
          </button>
        </div>
      </header>

      <main className='flex-1 overflow-auto p-4'>
        <div className='max-w-4xl mx-auto'>
          {/* Summary Card */}
          <div className='bg-white rounded-xl shadow-md p-5 mb-6'>
            <h2 className='text-xl font-bold mb-4'>
              Summary
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
              <div className='bg-gray-50 p-4 rounded-lg border border-gray-200'>
                <div className='text-sm text-gray-600 font-medium'>
                  Total Questions
                </div>
                <div className='text-3xl font-bold text-gray-700'>
                  {totalQuestions}
                </div>
              </div>

              <div className='bg-blue-50 p-4 rounded-lg border border-blue-200'>
                <div className='text-sm text-blue-600 font-medium'>
                  Unique Questions
                </div>
                <div className='text-3xl font-bold text-blue-700'>
                  {uniqueQuestionsAnswered}
                </div>
              </div>

              <div className='bg-purple-50 p-4 rounded-lg border border-purple-200'>
                <div className='text-sm text-purple-600 font-medium'>
                  Total Attempts
                </div>
                <div className='text-3xl font-bold text-purple-700'>
                  {totalAttempts}
                </div>
              </div>

              <div className='bg-green-50 p-4 rounded-lg border border-green-200'>
                <div className='text-sm text-green-600 font-medium'>
                  Correct Attempts
                </div>
                <div className='text-3xl font-bold text-green-700'>
                  {totalCorrectAttempts}
                </div>
              </div>

              <div className='bg-indigo-50 p-4 rounded-lg border border-indigo-200'>
                <div className='text-sm text-indigo-600 font-medium'>
                  Success Rate
                </div>
                <div className='text-3xl font-bold text-indigo-700'>
                  {overallCorrectRate}%
                </div>
              </div>
            </div>

            {/* Progress information */}
            <div className='mt-4 bg-blue-50 p-3 rounded-lg'>
              <div className='flex items-center justify-between mb-1'>
                <span className='text-sm font-medium text-blue-700'>
                  Questions Completed:{' '}
                  {uniqueQuestionsAnswered}/{totalQuestions}
                </span>
                <span className='text-sm font-medium text-blue-700'>
                  {Math.round(
                    (uniqueQuestionsAnswered /
                      totalQuestions) *
                      100
                  )}
                  %
                </span>
              </div>
              <div className='w-full bg-blue-200 rounded-full h-2.5'>
                <div
                  className='bg-blue-600 h-2.5 rounded-full'
                  style={{
                    width: `${Math.round(
                      (uniqueQuestionsAnswered /
                        totalQuestions) *
                        100
                    )}%`,
                  }}></div>
              </div>
            </div>

            {totalAttempts > 0 && (
              <button
                onClick={handleResetScores}
                className={`mt-4 px-4 py-2 rounded-lg text-sm ${
                  resetConfirm
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}>
                {resetConfirm
                  ? 'Confirm Reset All Stats'
                  : 'Reset All Stats'}
              </button>
            )}
          </div>

          {/* Questions List */}
          {loading ? (
            <div className='text-center py-10'>
              Loading question data...
            </div>
          ) : error ? (
            <div className='text-red-500 text-center py-5'>
              {error}
            </div>
          ) : totalAttempts === 0 ? (
            <div className='text-center py-10 text-gray-500'>
              You haven't answered any questions yet. Start
              the quiz to see your stats here!
            </div>
          ) : (
            <div className='bg-white rounded-xl shadow-md p-5'>
              <h2 className='text-xl font-bold mb-4'>
                Question Stats
              </h2>

              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th
                        scope='col'
                        className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                        onClick={() => handleSort('title')}>
                        Question{' '}
                        {renderSortIndicator('title')}
                      </th>
                      <th
                        scope='col'
                        className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                        onClick={() =>
                          handleSort('attempts')
                        }>
                        Attempts{' '}
                        {renderSortIndicator('attempts')}
                      </th>
                      <th
                        scope='col'
                        className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                        onClick={() =>
                          handleSort('successRate')
                        }>
                        Success Rate{' '}
                        {renderSortIndicator('successRate')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {sortedQuestionStats.map((stat) => (
                      <tr
                        key={stat.id}
                        className='hover:bg-gray-50'>
                        <td className='px-6 py-4 whitespace-normal text-sm font-medium text-gray-900'>
                          {stat.title}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-center font-medium'>
                          {stat.totalAttempts}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-center'>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${getSuccessRateColor(
                              stat.correctRate
                            )}`}>
                            {stat.correctRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default StatsPage
