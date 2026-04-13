import { create } from 'zustand'

interface AuthState {
  isTeacher: boolean
  sessionToken: string | null
  setTeacher: (isTeacher: boolean) => void
  setSessionToken: (token: string | null) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isTeacher: false,
  sessionToken: null,
  setTeacher: (isTeacher) => set({ isTeacher }),
  setSessionToken: (token) => set({ sessionToken: token }),
  reset: () => set({ isTeacher: false, sessionToken: null }),
}))
