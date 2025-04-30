interface ChatGPTResponse {
  explanation: string
  error?: string
}

interface QuestionData {
  title: string
  answers: Array<{
    title: string
    correct: string
  }>
  isCorrect: boolean
  userAnswer: string | string[]
}

export const getExplanationFromChatGPT = async (
  apiToken: string,
  questionData: QuestionData
): Promise<ChatGPTResponse> => {
  try {
    // Create a prompt that explains the question and answer
    const correctAnswers = questionData.answers
      .filter((answer) => answer.correct === '1')
      .map((answer) => answer.title)

    const correctAnswersText =
      correctAnswers.length > 1
        ? `The correct answers are: ${correctAnswers.join(
            ', '
          )}`
        : `The correct answer is: ${correctAnswers[0]}`

    const userAnswer = Array.isArray(
      questionData.userAnswer
    )
      ? questionData.userAnswer.join(', ')
      : questionData.userAnswer

    const outcomeText = questionData.isCorrect
      ? 'The user answered correctly.'
      : 'The user answered incorrectly.'

    const prompt = `
Question: ${questionData.title}

${outcomeText}
User's answer: ${userAnswer}
${correctAnswersText}

Please provide a detailed explanation of the answer. Explain why the correct answer is right, and if the user was wrong, explain why their answer was incorrect. Keep your explanation clear and instructive.
`

    // Call ChatGPT API
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that explains quiz answers in a clear and educational way.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      return {
        explanation: '',
        error:
          errorData.error?.message ||
          'Failed to get explanation from ChatGPT',
      }
    }

    const data = await response.json()
    return {
      explanation: data.choices[0].message.content,
    }
  } catch (error) {
    console.error('Error calling ChatGPT API:', error)
    return {
      explanation: '',
      error:
        'Failed to connect to ChatGPT. Please check your internet connection and API token.',
    }
  }
}

// Create a function for streaming explanations
export const streamExplanationFromChatGPT = (
  apiToken: string,
  questionData: QuestionData,
  onChunk: (chunk: string) => void,
  onError: (error: string) => void,
  onComplete: () => void
): (() => void) => {
  // Create a prompt that explains the question and answer
  const correctAnswers = questionData.answers
    .filter((answer) => answer.correct === '1')
    .map((answer) => answer.title)

  const correctAnswersText =
    correctAnswers.length > 1
      ? `The correct answers are: ${correctAnswers.join(
          ', '
        )}`
      : `The correct answer is: ${correctAnswers[0]}`

  const userAnswer = Array.isArray(questionData.userAnswer)
    ? questionData.userAnswer.join(', ')
    : questionData.userAnswer

  const outcomeText = questionData.isCorrect
    ? 'The user answered correctly.'
    : 'The user answered incorrectly.'

  const prompt = `
Question: ${questionData.title}

${outcomeText}
User's answer: ${userAnswer}
${correctAnswersText}

Please provide a detailed explanation of the answer. Explain why the correct answer is right, and if the user was wrong, explain why their answer was incorrect. Keep your explanation clear and instructive.
`

  // Create the fetch request with streaming enabled
  const controller = new AbortController()
  const signal = controller.signal

  // Create a function that will be returned to abort the request
  const abortRequest = () => {
    try {
      controller.abort()
    } catch (e) {
      console.error('Error aborting request:', e)
    }
  }

  // Start the fetch operation
  fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that explains quiz answers in a clear and educational way.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true, // Enable streaming
    }),
    signal,
  })
    .then((response) => {
      if (!response.ok) {
        // Try to extract the error message
        response
          .json()
          .then((errorData) => {
            onError(
              errorData.error?.message ||
                'Failed to get explanation from ChatGPT'
            )
          })
          .catch(() => {
            onError(
              `HTTP error: ${response.status} ${response.statusText}`
            )
          })
        return null
      }

      // Read and process the stream
      const reader = response.body?.getReader()
      if (!reader) {
        onError('Stream reader not available')
        return null
      }

      // Process the stream
      const processStream = async ({
        done,
        value,
      }: ReadableStreamReadResult<Uint8Array>) => {
        try {
          if (done) {
            onComplete()
            return
          }

          // Convert the chunk to text
          const chunk = new TextDecoder().decode(value)

          // Process SSE format (data: [JSON])
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (
              line.startsWith('data: ') &&
              line !== 'data: [DONE]'
            ) {
              try {
                const jsonData = JSON.parse(
                  line.replace('data: ', '')
                )
                const content =
                  jsonData.choices[0]?.delta?.content

                if (content) {
                  onChunk(content)
                }
              } catch (e) {
                // Continue if we encounter parsing errors for a chunk
                console.error('Error parsing SSE chunk:', e)
              }
            } else if (line === 'data: [DONE]') {
              onComplete()
              return
            }
          }

          // Continue reading - wrap in try/catch to handle aborted signals
          try {
            const nextChunk = await reader.read()
            processStream(nextChunk)
          } catch (error: any) {
            // If the signal was aborted, call onComplete and gracefully exit
            if (
              error.name === 'AbortError' ||
              error.message?.includes('aborted')
            ) {
              onComplete()
            } else {
              onError(
                `Error reading stream: ${error.message}`
              )
            }
          }
        } catch (error: any) {
          // Handle any other errors in processStream
          if (
            error.name === 'AbortError' ||
            error.message?.includes('aborted')
          ) {
            onComplete()
          } else {
            onError(
              `Stream processing error: ${error.message}`
            )
          }
        }
      }

      // Start reading with error handling
      reader
        .read()
        .then(processStream)
        .catch((error: any) => {
          if (
            error.name === 'AbortError' ||
            error.message?.includes('aborted')
          ) {
            onComplete()
          } else {
            onError(
              `Failed to start reading stream: ${error.message}`
            )
          }
        })
    })
    .catch((error: any) => {
      // Handle the case of aborted signals more gracefully
      if (
        error.name === 'AbortError' ||
        error.message?.includes('aborted')
      ) {
        onComplete()
      } else {
        onError(`API request error: ${error.message}`)
      }
    })

  // Return a function to abort the stream if needed
  return abortRequest
}
