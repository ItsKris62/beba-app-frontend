'use client'

import * as Sentry from '@sentry/nextjs'

export const initSentry = () => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend: (event, hint) => {
      if (typeof window !== 'undefined') {
        const tenantId = window.localStorage.getItem('tenant_id') ?? window.localStorage.getItem('tenantId')
        const userId = window.localStorage.getItem('user_id') ?? window.localStorage.getItem('userId')

        if (tenantId) event.tags = { ...event.tags, tenant_id: tenantId }
        if (userId) event.user = { ...event.user, id: userId }
      }

      if (hint.originalException instanceof Error) {
        const message = hint.originalException.message
        if (message.includes('ResizeObserver')) return null
        if (message.includes('localStorage')) return null
      }

      return event
    },
  })
}
