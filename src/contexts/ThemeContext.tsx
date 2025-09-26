'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  Sun,
  Moon,
  Palette,
  Droplets,
  Leaf,
  Mountain,
  Zap
} from 'lucide-react'

export interface Theme {
  name: string
  id: string
  icon: any
  colors: string
  accent: string
  description: string
  cssVariables: {
    primary: string
    primaryForeground: string
    background: string
    foreground: string
    accent: string
    accentForeground: string
    card: string
    cardForeground: string
    border: string
    muted: string
    mutedForeground: string
    secondary: string
    secondaryForeground: string
    input: string
    ring: string
  }
}

export const themes: Theme[] = [
  {
    name: 'Light',
    id: 'light',
    icon: Sun,
    colors: 'from-blue-50 to-indigo-50',
    accent: 'text-blue-600',
    description: 'Clean and bright',
    cssVariables: {
      primary: '220 38% 67%',
      primaryForeground: '210 40% 98%',
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      accent: '210 40% 96%',
      accentForeground: '222.2 84% 4.9%',
      card: '0 0% 100%',
      cardForeground: '222.2 84% 4.9%',
      border: '214.3 31.8% 91.4%',
      muted: '210 40% 96%',
      mutedForeground: '215.4 16.3% 46.9%',
      secondary: '210 40% 96%',
      secondaryForeground: '222.2 84% 4.9%',
      input: '214.3 31.8% 91.4%',
      ring: '220 38% 67%'
    }
  },
  {
    name: 'Dark',
    id: 'dark', 
    icon: Moon,
    colors: 'from-slate-900 to-gray-900',
    accent: 'text-slate-100',
    description: 'Easy on the eyes',
    cssVariables: {
      primary: '210 40% 98%',
      primaryForeground: '222.2 84% 4.9%',
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',
      accent: '217.2 32.6% 17.5%',
      accentForeground: '210 40% 98%',
      card: '222.2 84% 4.9%',
      cardForeground: '210 40% 98%',
      border: '217.2 32.6% 17.5%',
      muted: '217.2 32.6% 17.5%',
      mutedForeground: '215 20.2% 65.1%',
      secondary: '217.2 32.6% 17.5%',
      secondaryForeground: '210 40% 98%',
      input: '217.2 32.6% 17.5%',
      ring: '210 40% 98%'
    }
  },
  {
    name: 'Ocean',
    id: 'ocean',
    icon: Droplets,
    colors: 'from-cyan-50 to-blue-100',
    accent: 'text-cyan-600',
    description: 'Cool and calm',
    cssVariables: {
      primary: '188 95% 68%',
      primaryForeground: '210 40% 98%',
      background: '240 100% 97%',
      foreground: '222.2 84% 4.9%',
      accent: '224 100% 96%',
      accentForeground: '222.2 84% 4.9%',
      card: '240 100% 99%',
      cardForeground: '222.2 84% 4.9%',
      border: '224 100% 92%',
      muted: '224 100% 96%',
      mutedForeground: '215.4 16.3% 46.9%',
      secondary: '224 100% 96%',
      secondaryForeground: '222.2 84% 4.9%',
      input: '224 100% 92%',
      ring: '188 95% 68%'
    }
  },
  {
    name: 'Forest',
    id: 'forest',
    icon: Leaf,
    colors: 'from-green-50 to-emerald-100',
    accent: 'text-green-600',
    description: 'Natural vibes',
    cssVariables: {
      primary: '142 76% 36%',
      primaryForeground: '210 40% 98%',
      background: '138 76% 97%',
      foreground: '222.2 84% 4.9%',
      accent: '138 76% 96%',
      accentForeground: '222.2 84% 4.9%',
      card: '138 76% 99%',
      cardForeground: '222.2 84% 4.9%',
      border: '138 76% 92%',
      muted: '138 76% 96%',
      mutedForeground: '215.4 16.3% 46.9%',
      secondary: '138 76% 96%',
      secondaryForeground: '222.2 84% 4.9%',
      input: '138 76% 92%',
      ring: '142 76% 36%'
    }
  },
  {
    name: 'Sunset',
    id: 'sunset',
    icon: Mountain,
    colors: 'from-orange-50 to-pink-100',
    accent: 'text-orange-600',
    description: 'Warm and cozy',
    cssVariables: {
      primary: '24 95% 53%',
      primaryForeground: '210 40% 98%',
      background: '24 100% 97%',
      foreground: '222.2 84% 4.9%',
      accent: '24 100% 96%',
      accentForeground: '222.2 84% 4.9%',
      card: '24 100% 99%',
      cardForeground: '222.2 84% 4.9%',
      border: '24 100% 92%',
      muted: '24 100% 96%',
      mutedForeground: '215.4 16.3% 46.9%',
      secondary: '24 100% 96%',
      secondaryForeground: '222.2 84% 4.9%',
      input: '24 100% 92%',
      ring: '24 95% 53%'
    }
  },
  {
    name: 'Electric',
    id: 'electric',
    icon: Zap,
    colors: 'from-purple-50 to-violet-100',
    accent: 'text-purple-600',
    description: 'Bold and vibrant',
    cssVariables: {
      primary: '262 83% 58%',
      primaryForeground: '210 40% 98%',
      background: '270 100% 98%',
      foreground: '222.2 84% 4.9%',
      accent: '270 100% 96%',
      accentForeground: '222.2 84% 4.9%',
      card: '270 100% 99%',
      cardForeground: '222.2 84% 4.9%',
      border: '270 100% 92%',
      muted: '270 100% 96%',
      mutedForeground: '215.4 16.3% 46.9%',
      secondary: '270 100% 96%',
      secondaryForeground: '222.2 84% 4.9%',
      input: '270 100% 92%',
      ring: '262 83% 58%'
    }
  }
]

interface ThemeContextType {
  currentTheme: string
  theme: Theme
  setTheme: (themeId: string) => void
  themes: Theme[]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState('light')
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage on component mount
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme && themes.find(t => t.id === savedTheme)) {
      setCurrentTheme(savedTheme)
    }
  }, [])

  // Apply theme to document and save to localStorage
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const theme = themes.find(t => t.id === currentTheme)
    
    if (!theme) return

    // Remove existing theme classes
    themes.forEach(t => {
      root.classList.remove(`theme-${t.id}`)
    })
    
    // Add current theme class
    root.classList.add(`theme-${currentTheme}`)
    
    // Save theme to localStorage
    localStorage.setItem('theme', currentTheme)
    
    // Apply theme-specific CSS variables
    Object.entries(theme.cssVariables).forEach(([key, value]) => {
      const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      root.style.setProperty(`--${cssVar}`, value)
    })

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', 
        currentTheme === 'dark' ? '#0f172a' : '#ffffff'
      )
    }
  }, [currentTheme, mounted])

  const setTheme = (themeId: string) => {
    if (themes.find(t => t.id === themeId)) {
      setCurrentTheme(themeId)
    }
  }

  const theme = themes.find(t => t.id === currentTheme) || themes[0]

  const value = {
    currentTheme,
    theme,
    setTheme,
    themes
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}