'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

// Se next-themes è installato, usalo. Altrimenti usa questo fallback.
// Per installare next-themes: npm install next-themes

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'system',
  storageKey = 'studentup-theme'
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Get system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Resolve actual theme
  const resolveTheme = (t: Theme): 'light' | 'dark' => {
    if (t === 'system') return getSystemTheme()
    return t
  }

  // Initialize on mount
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(storageKey) as Theme | null
    const initialTheme = stored || defaultTheme
    setThemeState(initialTheme)
    setResolvedTheme(resolveTheme(initialTheme))
  }, [defaultTheme, storageKey])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return
    
    const resolved = resolveTheme(theme)
    setResolvedTheme(resolved)
    
    // Apply class to html element
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
    
    // Save to localStorage
    localStorage.setItem(storageKey, theme)
  }, [theme, mounted, storageKey])

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        setResolvedTheme(getSystemTheme())
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(getSystemTheme())
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    // Fallback se usato fuori dal provider
    return {
      theme: 'system' as Theme,
      setTheme: (_theme: Theme) => {},
      resolvedTheme: 'light' as const
    }
  }
  return context
}