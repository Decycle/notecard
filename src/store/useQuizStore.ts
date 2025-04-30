import { create } from 'zustand'
import {
  persist,
  createJSONStorage,
} from 'zustand/middleware'

// Define types for our store
interface QuestionAttempt {
  timestamp: number
  isCorrect: boolean
}

interface AnswerHistory {
  [questionId: string]: QuestionAttempt[]
}

interface QuizState {
  answerHistory: AnswerHistory
  selectedQuestionId: string | null
  addQuestionResult: (
    questionId: string,
    isCorrect: boolean
  ) => void
  resetScores: () => void
  selectQuestion: (questionId: string | null) => void
  getQuestionStats: (questionId: string) => {
    totalAttempts: number
    correctAttempts: number
    correctRate: number
    lastAttempt?: QuestionAttempt
  }
}

// Define the store with Zustand
const useQuizStore = create<QuizState>()(
  // Add persist middleware
  persist(
    (set, get) => ({
      // State
      answerHistory: {},
      selectedQuestionId: null,

      // Actions
      addQuestionResult: (questionId, isCorrect) => {
        set((state) => {
          const currentAttempts =
            state.answerHistory[questionId] || []
          return {
            answerHistory: {
              ...state.answerHistory,
              [questionId]: [
                ...currentAttempts,
                {
                  timestamp: Date.now(),
                  isCorrect,
                },
              ],
            },
          }
        })
      },

      resetScores: () => set({ answerHistory: {} }),

      selectQuestion: (questionId) => {
        set({ selectedQuestionId: questionId })
      },

      getQuestionStats: (questionId) => {
        const state = get()

        // Get all attempts for this question
        const attempts =
          state.answerHistory[questionId] || []

        // Calculate stats for all attempts
        const totalAttempts = attempts.length
        const correctAttempts = attempts.filter(
          (attempt) => attempt.isCorrect
        ).length

        // Calculate success rate
        const correctRate =
          totalAttempts > 0
            ? Math.round(
                (correctAttempts / totalAttempts) * 100
              )
            : 0

        // Get the most recent attempt
        const lastAttempt =
          attempts.length > 0
            ? attempts[attempts.length - 1]
            : undefined

        return {
          totalAttempts,
          correctAttempts,
          correctRate,
          lastAttempt,
        }
      },
    }),
    {
      name: 'quiz-storage', // name of the item in storage
      storage: createJSONStorage(() => sessionStorage), // use sessionStorage
      partialize: (state) => ({
        answerHistory: state.answerHistory,
        selectedQuestionId: state.selectedQuestionId,
      }), // persist answerHistory and selectedQuestionId
    }
  )
)

export default useQuizStore
