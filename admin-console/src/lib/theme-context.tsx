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
  const [mounted, setMounted] = useState(true);

  // Lazy initial state for theme
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('admin-theme') as Theme;
      if (savedTheme && ['light', 'dark', 'gold'].includes(savedTheme)) {
        return savedTheme;
      }
    }
    return 'dark';
  });

  // Lazy initial state for accessibility
  const [accessibility, setAccessibilityState] = useState<AccessibilitySettings>(() => {
    if (typeof window !== 'undefined') {
      const savedAccessibility = localStorage.getItem('admin-accessibility');
      if (savedAccessibility) {
        try {
          return JSON.parse(savedAccessibility);
        } catch (e) {
          console.warn('Failed to parse accessibility settings from localStorage');
        }
      }
    }
    return {
      highContrast: false,
      largeText: false,
      reduceMotion: false
    };
  });

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove('light', 'dark', 'gold');

    // Add current theme class
    root.classList.add(theme);

    // Save to localStorage
    localStorage.setItem('admin-theme', theme);

    // Update meta theme-color for mobile browsers
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

  // Accessibility settings handler
  const setAccessibility = (settings: Partial<AccessibilitySettings>) => {
    setAccessibilityState(prev => {
      const newSettings = { ...prev, ...settings };
      localStorage.setItem('admin-accessibility', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Handle accessibility classes
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

  if (!mounted) {
    return <>{children}</>;
  }

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
