import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Normalizes any Kenyan phone input (07..., 254..., +254...) to E.164 "+254XXXXXXXXX". */
export function normalizeKenyanPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('254')) {
    return `+${digits.slice(0, 12)}`
  }
  if (digits.startsWith('0')) {
    return `+254${digits.slice(1, 10)}`
  }
  return `+254${digits.slice(0, 9)}`
}

/** Strips the +254 prefix for display in a "national number" input field. */
export function displayKenyanPhone(phone: string): string {
  return phone.replace(/^\+254/, '')
}
