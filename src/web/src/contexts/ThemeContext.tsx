import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as EmotionThemeProvider } from '@emotion/react'; // @emotion/react ^11.10.0
import defaultTheme from '../styles/themes/default';
import darkTheme from '../styles/themes/dark';
import GlobalStyles from '../styles/GlobalStyles';
import useLocalStorage from '../hooks/useLocalStorage';

// Key used for storing theme preference in localStorage
const THEME_STORAGE_KEY = 'theme-preference';

// Available themes object
const themes = {
  light: defaultTheme,
  dark: darkTheme
};

/**
 * Type definition for theme object
 */
interface ThemeType {
  name: string;
  colors: object;
  background: object;
  text: object;
  border: object;
  shadows: object;
}

/**
 * Type definition for theme context value
 */
interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

/**
 * Props for the ThemeProvider component
 */
interface ThemeProviderProps {
  children: ReactNode;
}

// Create the theme context with undefined default value
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Provider component that makes theme functionality available to child components
 * Implements theme toggling and persistence via localStorage
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Use localStorage to persist theme preference
  const [themePreference, setThemePreference] = useLocalStorage<'light' | 'dark'>(
    THEME_STORAGE_KEY,
    'light'
  );

  // Function to toggle between light and dark themes
  const toggleTheme = () => {
    setThemePreference(themePreference === 'light' ? 'dark' : 'light');
  };

  // Determine the current theme object based on preference
  const currentTheme = themes[themePreference];
  
  // Create the context value with theme, toggle function, and dark mode flag
  const contextValue: ThemeContextType = {
    theme: currentTheme,
    toggleTheme,
    isDarkMode: themePreference === 'dark'
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <EmotionThemeProvider theme={currentTheme}>
        <GlobalStyles />
        {children}
      </EmotionThemeProvider>
    </ThemeContext.Provider>
  );
};

/**
 * Custom hook to access the theme context
 * Throws an error if used outside of ThemeProvider
 */
export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  
  return context;
};