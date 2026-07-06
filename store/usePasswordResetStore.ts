"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type Step = "enter-phone" | "confirm" | "success"

const TIMER_SECONDS = 20 * 60

export interface PasswordResetState {
  step: Step
  phone: string
  pin: string
  newPassword: string
  confirmPassword: string
  expiresAt: number | null
  timeRemaining: number
  isLoading: boolean
  error: string | null
  setStep: (step: Step) => void
  setPhone: (phone: string) => void
  setPin: (pin: string) => void
  setNewPassword: (newPassword: string) => void
  setConfirmPassword: (confirmPassword: string) => void
  startTimer: () => void
  getTimeRemaining: () => number
  resetFlow: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  syncTimer: () => void
  clearPin: () => void
}

const initialState = {
  step: "enter-phone" as Step,
  phone: "",
  pin: "",
  newPassword: "",
  confirmPassword: "",
  expiresAt: null as number | null,
  timeRemaining: 0,
  isLoading: false,
  error: null as string | null,
}

function getRemainingSeconds(expiresAt: number | null): number {
  if (!expiresAt) {
    return 0
  }

  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
}

export const usePasswordResetStore = create<PasswordResetState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setStep: (step) => set({ step, error: null }),
      setPhone: (phone) => set({ phone }),
      setPin: (pin) => set({ pin }),
      setNewPassword: (newPassword) => set({ newPassword }),
      setConfirmPassword: (confirmPassword) => set({ confirmPassword }),
      startTimer: () => {
        set({
          expiresAt: Date.now() + TIMER_SECONDS * 1000,
          timeRemaining: TIMER_SECONDS,
        })
      },
      getTimeRemaining: () => getRemainingSeconds(get().expiresAt),
      resetFlow: () => set(initialState),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      syncTimer: () => {
        const { expiresAt, step } = get()
        const timeRemaining = getRemainingSeconds(expiresAt)

        if (expiresAt && timeRemaining === 0 && step === "confirm") {
          set({
            step: "enter-phone",
            pin: "",
            newPassword: "",
            confirmPassword: "",
            expiresAt: null,
            timeRemaining: 0,
            isLoading: false,
            error: "Your PIN has expired. Please request a new one.",
          })
          return
        }

        set({ timeRemaining })
      },
      clearPin: () => set({ pin: "" }),
    }),
    {
      name: "beba-password-reset-flow",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        step: state.step,
        phone: state.phone,
        pin: state.pin,
        newPassword: state.newPassword,
        confirmPassword: state.confirmPassword,
        expiresAt: state.expiresAt,
        timeRemaining: state.timeRemaining,
        error: state.error,
      }),
      onRehydrateStorage: () => (state) => {
        state?.syncTimer()
      },
    },
  ),
)
