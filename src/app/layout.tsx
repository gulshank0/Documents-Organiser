import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/ui/Navigation'
import { QueryProvider } from './provider'
import { ThemeProvider } from '@/contexts/ThemeContext'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: {
    default: 'S-Documents Dashboard',
    template: '%s | S-Documents Dashboard'
  },
  description: 'Knowledge Management and Resource Library',
  keywords: ['S-Documents', 'document management', 'AI', 'OCR', 'compliance', 'Notes','notes', 'Kerala'],
  authors: [{ name: 'Gulshan Kumar' }],
  creator: 'Gulshan Kumar',
  publisher: 'Kochi Metro Rail Limited',
  robots: 'noindex, nofollow', // Private system
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'S-Documents Dashboard',
    description: 'Knowledge Management and Resource Library',
    siteName: 'S-Documents Dashboard',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0ea5e9' },
    { media: '(prefers-color-scheme: dark)', color: '#0ea5e9' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`} suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-background text-foreground min-h-screen overflow-x-hidden`}>
        <ThemeProvider>
          <QueryProvider>
            {/* Background Pattern */}
            <div className="fixed inset-0 -z-10">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="absolute top-0 right-0 -translate-y-12 translate-x-12">
                <div className="w-96 h-96 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full blur-3xl animate-pulse-slow" />
              </div>
              <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12">
                <div className="w-96 h-96 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full blur-3xl animate-pulse-slow" />
              </div>
            </div>
            
            {/* Navigation Component - handles its own positioning */}
            <Navigation />
            
            {/* Main Content - positioned to work with the Navigation */}
            <main className="xl:ml-80 min-h-screen">
              <div className="pt-16 xl:pt-20 min-h-screen w-full">
                {children}
              </div>
            </main>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}