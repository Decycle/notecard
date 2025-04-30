import { create } from 'zustand'
import {
  persist,
  createJSONStorage,
} from 'zustand/middleware'

interface AuthState {
  apiToken: string | null
  setApiToken: (token: string) => void
  clearApiToken: () => void
  hasToken: () => boolean
}

// Define the store with Zustand
const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      apiToken: null,

      setApiToken: (token) => {
        set({ apiToken: token })
      },

      clearApiToken: () => {
        set({ apiToken: null })
      },

      hasToken: () => {
        return (
          get().apiToken !== null && get().apiToken !== ''
        )
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)

export default useAuthStore
