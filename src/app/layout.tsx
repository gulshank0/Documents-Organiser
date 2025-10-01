import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from './provider'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ConditionalNavigation } from '@/components/ui/ConditionalNavigation'
import { AuthProvider } from '@/components/AuthProvider'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: {
    default: 'S-Docs',
    template: '%s | S-Docs'
  },
  description: 'Knowledge Management and Resource Library',
  keywords: ['S-Documents', 'document management', 'AI', 'OCR', 'compliance', 'Notes','notes', 'Kerala'],
  authors: [{ name: 'Gulshan Kumar' }],
  creator: 'Gulshan Kumar',
  publisher: 'Kochi Metro Rail Limited',
  robots: 'noindex, nofollow', // Private system
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'S-Docs',
    description: 'Knowledge Management and Resource Library',
    siteName: 'S-Docs',
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
        <AuthProvider>
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
              
              {/* Conditional Navigation Component */}
              <ConditionalNavigation />
              
              {/* Main Content */}
              <ConditionalMainContent>
                {children}
              </ConditionalMainContent>
            </QueryProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

// Component to conditionally render main content with proper positioning
function ConditionalMainContent({ children }: Readonly<{ children: React.ReactNode }>) {
  'use client';
  
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  
  // Pages that don't need navigation spacing (including 404 pages)
  const excludedPages = ['/', '/login', '/register'];
  
  // Known routes in the application
  const knownRoutes = [
    '/',
    '/login',
    '/register',
    '/dashboard',
    '/documents',
    '/upload',
    '/search',
    '/profile',
    '/integrations'
  ];
  
  // Check if pathname matches any known route
  const isKnownRoute = knownRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  // Check if it's a 404 page (unknown route)
  const is404Page = !isKnownRoute;
  
  const shouldExcludeSpacing = excludedPages.includes(pathname) || is404Page;
  
  if (shouldExcludeSpacing) {
    return <>{children}</>;
  }
  
  return (
    <main className="xl:ml-80 min-h-screen">
      <div className="pt-16 xl:pt-20 min-h-screen w-full">
        {children}
      </div>
    </main>
  );
}