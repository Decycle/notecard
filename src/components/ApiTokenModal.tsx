import { useState } from 'react'
import useAuthStore from '../store/useAuthStore'

interface ApiTokenModalProps {
  isOpen: boolean
  onClose: () => void
}

const ApiTokenModal = ({
  isOpen,
  onClose,
}: ApiTokenModalProps) => {
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const setApiToken = useAuthStore(
    (state) => state.setApiToken
  )

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (token.trim()) {
      setApiToken(token.trim())
      onClose()
    }
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg p-6 w-full max-w-md'>
        <h2 className='text-xl font-bold mb-4'>
          Enter ChatGPT API Token
        </h2>

        <p className='text-gray-600 mb-4'>
          Your API token is stored securely in your
          browser's session storage and is never sent to our
          servers. It will be used only to get explanations
          from the ChatGPT API.
        </p>

        <form onSubmit={handleSubmit}>
          <div className='mb-4'>
            <label
              htmlFor='apiToken'
              className='block text-sm font-medium text-gray-700 mb-1'>
              API Token
            </label>
            <div className='relative'>
              <input
                id='apiToken'
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                placeholder='sk-...'
                required
              />
              <button
                type='button'
                className='absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500'
                onClick={() => setShowToken(!showToken)}>
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className='mt-1 text-xs text-gray-500'>
              You can find your API token in the{' '}
              <a
                href='https://platform.openai.com/api-keys'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-500 hover:underline'>
                OpenAI dashboard
              </a>
              .
            </p>
          </div>

          <div className='flex justify-end space-x-3'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200'>
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700'>
              Save Token
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApiTokenModal
