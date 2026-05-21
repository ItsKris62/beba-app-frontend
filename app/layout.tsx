import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/lib/auth-context'
import { QueryProvider } from '@/components/query-provider'
import { Toaster } from '@/components/ui/sonner'
import { GlobalErrorListener } from '@/components/global-error-listener'
import './globals.css'

export const metadata: Metadata = {
  title: 'KC Boda Sacco - Your Path to Financial Freedom',
  description: 'Join over 2,000 members enjoying better dividends and instant loans with KC Boda Sacco, Kenya\'s trusted Savings and Credit Cooperative.',
  keywords: ['SACCO', 'savings', 'loans', 'Kenya', 'financial', 'cooperative', 'FOSA', 'BOSA', 'KC Boda', 'Kisumu'],
  authors: [{ name: 'KC Boda Sacco' }],
  generator: 'v0.app',
  icons: {
    icon: '/kc-favicon.png',
    apple: '/kc-favicon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#305CDE' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0F1A' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <GlobalErrorListener />
              {children}
              <Toaster richColors position="top-right" />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
