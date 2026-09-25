import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'space-black' | 'frosted-light';

interface ThemeContextType {
  theme: ThemeMode;
  isLight: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'arman_store_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'frosted-light' || saved === 'space-black') {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'space-black';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'frosted-light') {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
      root.style.colorScheme = 'light';
    } else {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
      root.style.colorScheme = 'dark';
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'space-black' ? 'frosted-light' : 'space-black'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isLight: theme === 'frosted-light', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
