"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type Method = "EMAIL" | "SMS"
export type Step = "select-method" | "enter-identifier" | "verify-otp" | "set-password" | "success"

const TIMER_SECONDS = 30 * 60

export interface PasswordResetState {
  method: Method | null
  step: Step
  identifier: string
  otp: string
  newPassword: string
  confirmPassword: string
  expiresAt: number | null
  timeRemaining: number
  isLoading: boolean
  error: string | null
  setMethod: (method: Method) => void
  setStep: (step: Step) => void
  setIdentifier: (identifier: string) => void
  setOtp: (otp: string) => void
  setNewPassword: (newPassword: string) => void
  setConfirmPassword: (confirmPassword: string) => void
  startTimer: () => void
  getTimeRemaining: () => number
  resetFlow: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  syncTimer: () => void
  clearOtp: () => void
}

const initialState = {
  method: null,
  step: "select-method" as Step,
  identifier: "",
  otp: "",
  newPassword: "",
  confirmPassword: "",
  expiresAt: null,
  timeRemaining: 0,
  isLoading: false,
  error: null,
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
      setMethod: (method) =>
        set({
          method,
          step: "enter-identifier",
          identifier: "",
          otp: "",
          newPassword: "",
          confirmPassword: "",
          error: null,
        }),
      setStep: (step) => set({ step, error: null }),
      setIdentifier: (identifier) => set({ identifier }),
      setOtp: (otp) => set({ otp }),
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

        if (
          expiresAt &&
          timeRemaining === 0 &&
          step !== "select-method" &&
          step !== "enter-identifier" &&
          step !== "success"
        ) {
          set({
            step: "enter-identifier",
            otp: "",
            newPassword: "",
            confirmPassword: "",
            expiresAt: null,
            timeRemaining: 0,
            isLoading: false,
            error: "Your OTP has expired. Please request a new code.",
          })
          return
        }

        set({ timeRemaining })
      },
      clearOtp: () => set({ otp: "" }),
    }),
    {
      name: "beba-password-reset-flow",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        method: state.method,
        step: state.step,
        identifier: state.identifier,
        otp: state.otp,
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
