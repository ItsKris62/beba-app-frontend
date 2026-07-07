"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { generateIdempotencyKey } from "@/lib/api-client"
import type { SelectedGuarantor } from "@/components/GuarantorLookup"

export type LoanWizardStep = "product" | "terms" | "guarantors" | "review"

interface LoanApplicationDraft {
  step: LoanWizardStep
  loanProductId: string
  principalAmount: string
  tenureMonths: string
  purpose: string
  guarantors: SelectedGuarantor[]
  idempotencyKey: string | null
}

export interface LoanApplicationState extends LoanApplicationDraft {
  setStep: (step: LoanWizardStep) => void
  setProduct: (loanProductId: string) => void
  setTerms: (principalAmount: string, tenureMonths: string, purpose: string) => void
  addGuarantor: (guarantor: SelectedGuarantor) => void
  removeGuarantor: (memberId: string) => void
  /** Generates the application's idempotency key on first call, then always returns the same one. */
  ensureIdempotencyKey: () => string
  reset: () => void
}

const initialDraft: LoanApplicationDraft = {
  step: "product",
  loanProductId: "",
  principalAmount: "",
  tenureMonths: "",
  purpose: "",
  guarantors: [],
  idempotencyKey: null,
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return generateIdempotencyKey()
}

export const useLoanApplicationStore = create<LoanApplicationState>()(
  persist(
    (set, get) => ({
      ...initialDraft,
      setStep: (step) => set({ step }),
      setProduct: (loanProductId) => set({ loanProductId, guarantors: [], step: "terms" }),
      setTerms: (principalAmount, tenureMonths, purpose) =>
        set({ principalAmount, tenureMonths, purpose, step: "guarantors" }),
      addGuarantor: (guarantor) =>
        set((state) =>
          state.guarantors.some((item) => item.memberId === guarantor.memberId)
            ? state
            : { guarantors: [...state.guarantors, guarantor] },
        ),
      removeGuarantor: (memberId) =>
        set((state) => ({ guarantors: state.guarantors.filter((item) => item.memberId !== memberId) })),
      ensureIdempotencyKey: () => {
        const existing = get().idempotencyKey
        if (existing) return existing
        const key = generateUuid()
        set({ idempotencyKey: key })
        return key
      },
      reset: () => set(initialDraft),
    }),
    {
      // Draft lives in sessionStorage (not localStorage): it survives an
      // accidental refresh mid-application, but clears when the tab closes —
      // a half-finished loan application (guarantor selections, amounts)
      // shouldn't outlive the browser tab on a shared/cyber-café device.
      name: "beba-loan-application-draft",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
