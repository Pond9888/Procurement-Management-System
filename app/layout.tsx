import type { Metadata } from 'next'
import { Sarabun } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const sarabun = Sarabun({
  variable: '--font-sarabun',
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Vertex Payment',
  description: 'ระบบจัดการการจัดซื้อและการเงิน — ProcureFlow Corp.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="th"
      // `dark` matches ThemeProvider's defaultTheme so the first paint is not
      // a flash of light; next-themes swaps it if the user picked otherwise.
      className={`dark ${sarabun.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background font-[var(--font-sarabun)]">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
