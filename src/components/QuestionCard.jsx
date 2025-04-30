import { useState, useEffect } from 'react'
// @ts-expect-error - TypeScript doesn't recognize this import
import ExplanationPanel from './ExplanationPanel'

export default function QuestionCard({
  question,
  onNext,
  onAnswerSubmit,
}) {
  const [selectedAnswers, setSelectedAnswers] = useState(
    new Set()
  )
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswers(new Set())
    setIsSubmitted(false)
  }, [question])

  // Check if the question requires multiple answers
  const isMultipleChoice =
    question.answers.filter(
      (answer) => answer.correct === '1'
    ).length > 1

  // Click handler for the entire answer row
  const handleAnswerClick = (index) => {
    if (isSubmitted) return

    setSelectedAnswers((prevSelected) => {
      const newSelected = new Set([...prevSelected])

      if (isMultipleChoice) {
        // Toggle selection for multiple choice
        if (newSelected.has(index)) {
          newSelected.delete(index)
        } else {
          newSelected.add(index)
        }
      } else {
        // Single choice - replace selection
        newSelected.clear()
        newSelected.add(index)
      }

      return newSelected
    })
  }

  const handleSubmit = () => {
    setIsSubmitted(true)

    // Use the question's unique ID directly
    const isCorrect = checkIfCorrect()

    // Pass result to parent for tracking
    onAnswerSubmit(question.id, isCorrect)
  }

  const getCorrectAnswerIndices = () => {
    return question.answers
      .map((answer, index) =>
        answer.correct === '1' ? index : -1
      )
      .filter((index) => index !== -1)
  }

  const checkIfCorrect = () => {
    const correctIndices = getCorrectAnswerIndices()

    // For multiple choice, all correct answers must be selected and no incorrect ones
    if (isMultipleChoice) {
      // Convert sets to arrays for easier comparison
      const selected = Array.from(selectedAnswers).sort()
      const correct = correctIndices.sort()

      // Check if arrays have same length and all elements match
      return (
        selected.length === correct.length &&
        selected.every(
          (value, index) => value === correct[index]
        )
      )
    } else {
      // For single choice, the selected answer must be the correct one
      return selectedAnswers.has(correctIndices[0])
    }
  }

  const isCorrect = checkIfCorrect()

  const getUserSelectedAnswers = () => {
    // Convert selected indices to answer titles for the explanation
    try {
      return Array.from(selectedAnswers).map(
        (index) => question.answers[index].title
      )
    } catch (error) {
      console.error(
        'Error getting user selected answers:',
        error
      )
      console.log(question)
      console.log(question.answers)
      console.log(selectedAnswers)
      return []
    }
  }

  return (
    <div className='bg-white rounded-xl shadow-md overflow-hidden p-5 mb-6'>
      <h2 className='text-xl font-bold mb-3'>
        {question.title}
      </h2>

      {isMultipleChoice && !isSubmitted && (
        <div className='mb-3 text-blue-600 font-medium bg-blue-50 p-2 rounded-md border border-blue-200'>
          This is a multiple choice question - select ALL
          correct answers
        </div>
      )}

      <div className='space-y-2 max-h-[50vh] overflow-auto'>
        {question.answers.map((answer, index) => {
          const isSelected = selectedAnswers.has(index)
          return (
            <div
              key={index}
              onClick={() => handleAnswerClick(index)}
              className={`p-3 rounded-lg cursor-pointer border-2 flex items-center transition-colors ${
                isSelected
                  ? isSubmitted
                    ? answer.correct === '1'
                      ? 'bg-green-100 border-green-500'
                      : 'bg-red-100 border-red-500'
                    : 'bg-blue-100 border-blue-500'
                  : isSubmitted && answer.correct === '1'
                  ? 'bg-green-100 border-green-500'
                  : 'hover:bg-gray-100 border-gray-200'
              }`}>
              <div
                className={`w-6 h-6 flex-shrink-0 mr-3 flex items-center justify-center ${
                  isMultipleChoice
                    ? 'border-2 rounded-md'
                    : 'border-2 rounded-full'
                } ${
                  isSelected
                    ? isSubmitted
                      ? answer.correct === '1'
                        ? 'border-green-500 bg-green-500'
                        : 'border-red-500 bg-red-500'
                      : 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 bg-white'
                }`}>
                {isSelected && !isSubmitted && (
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='white'
                    className='w-4 h-4'>
                    <path
                      fillRule='evenodd'
                      d='M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z'
                      clipRule='evenodd'
                    />
                  </svg>
                )}
                {isSubmitted && isSelected && (
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='white'
                    className='w-4 h-4'>
                    <path
                      fillRule='evenodd'
                      d='M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z'
                      clipRule='evenodd'
                    />
                  </svg>
                )}
              </div>
              <div className='flex-1 text-left'>
                {answer.title}
              </div>
            </div>
          )
        })}
      </div>

      <div className='mt-4 flex flex-col space-y-3'>
        {!isSubmitted && (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswers.size === 0}
            className='px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed'>
            Submit Answer{isMultipleChoice ? 's' : ''}
          </button>
        )}

        {isSubmitted && (
          <>
            <div
              className={`p-3 rounded-lg ${
                isCorrect
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
              {isCorrect
                ? 'Correct!'
                : isMultipleChoice
                ? 'Incorrect! You needed to select all correct answers and only correct answers.'
                : `Incorrect! The correct answer was: ${
                    question.answers[
                      getCorrectAnswerIndices()[0]
                    ].title
                  }`}
            </div>

            {isMultipleChoice && !isCorrect && (
              <div className='text-sm mt-1 p-2 bg-gray-50 rounded'>
                <div className='font-medium mb-1'>
                  Correct answers:
                </div>
                {getCorrectAnswerIndices().map((index) => (
                  <div
                    key={index}
                    className='ml-2 flex items-center mb-1'>
                    <div className='w-4 h-4 mr-2 rounded-sm border-2 border-green-500 bg-green-500 flex items-center justify-center'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 24 24'
                        fill='white'
                        className='w-3 h-3'>
                        <path
                          fillRule='evenodd'
                          d='M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <span>
                      {question.answers[index].title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ChatGPT Explanation Panel */}
            <ExplanationPanel
              question={question}
              isCorrect={isCorrect}
              userAnswer={getUserSelectedAnswers()}
            />

            <button
              onClick={onNext}
              className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors mt-4'>
              Next Question
            </button>
          </>
        )}
      </div>
    </div>
  )
}
