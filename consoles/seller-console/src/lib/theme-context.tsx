'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'gold';

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accessibility: AccessibilitySettings;
  setAccessibility: (settings: Partial<AccessibilitySettings>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [accessibility, setAccessibilityState] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    reduceMotion: false
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('seller-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'gold'].includes(savedTheme)) {
      setTheme(savedTheme);
    }

    const savedAccessibility = localStorage.getItem('seller-accessibility');
    if (savedAccessibility) {
      try {
        const parsed = JSON.parse(savedAccessibility);
        setAccessibilityState(parsed);
      } catch (e) {
        console.warn('Failed to parse accessibility settings from localStorage');
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'gold');
    root.classList.add(theme);
    localStorage.setItem('seller-theme', theme);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      switch (theme) {
        case 'light':
          metaThemeColor.setAttribute('content', '#ffffff');
          break;
        case 'dark':
          metaThemeColor.setAttribute('content', '#1f2937');
          break;
        case 'gold':
          metaThemeColor.setAttribute('content', '#f59e0b');
          break;
      }
    }
  }, [theme, mounted]);

  const setAccessibility = (settings: Partial<AccessibilitySettings>) => {
    setAccessibilityState(prev => {
      const newSettings = { ...prev, ...settings };
      localStorage.setItem('seller-accessibility', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    if (accessibility.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (accessibility.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    if (accessibility.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [accessibility, mounted]);

  const value = {
    theme,
    setTheme,
    accessibility,
    setAccessibility
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}