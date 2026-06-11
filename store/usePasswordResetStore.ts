"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type Step = "request" | "verify" | "reset" | "success"

type ResetField = "lastFiveDigits" | "otp" | "newPassword" | "confirmPassword"

export interface PasswordResetState {
  step: Step
  lastFiveDigits: string
  otp: string
  newPassword: string
  confirmPassword: string
  expiresAt: Date | null
  timeRemaining: number
  isLoading: boolean
  error: string | null
  setStep: (step: Step) => void
  setField: (field: ResetField, value: string) => void
  startTimer: () => void
  resetFlow: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  syncTimer: () => void
  clearOtp: () => void
}

const TIMER_SECONDS = 30 * 60

const initialState = {
  step: "request" as Step,
  lastFiveDigits: "",
  otp: "",
  newPassword: "",
  confirmPassword: "",
  expiresAt: null,
  timeRemaining: 0,
  isLoading: false,
  error: null,
}

function getRemainingSeconds(expiresAt: Date | null): number {
  if (!expiresAt) {
    return 0
  }

  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
}

export const usePasswordResetStore = create<PasswordResetState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setStep: (step) => set({ step, error: null }),
      setField: (field, value) => set({ [field]: value }),
      startTimer: () => {
        const expiresAt = new Date(Date.now() + TIMER_SECONDS * 1000)
        set({ expiresAt, timeRemaining: TIMER_SECONDS })
      },
      resetFlow: () => set(initialState),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      syncTimer: () => {
        const { expiresAt, step } = get()
        const timeRemaining = getRemainingSeconds(expiresAt)

        if (expiresAt && timeRemaining === 0 && step !== "request" && step !== "success") {
          set({
            step: "request",
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
      storage: createJSONStorage(() => localStorage, {
        replacer: (key, value) => {
          if (key === "expiresAt" && value instanceof Date) {
            return value.toISOString()
          }
          return value
        },
        reviver: (key, value) => {
          if (key === "expiresAt" && typeof value === "string") {
            return new Date(value)
          }
          return value
        },
      }),
      partialize: (state) => ({
        step: state.step,
        lastFiveDigits: state.lastFiveDigits,
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
