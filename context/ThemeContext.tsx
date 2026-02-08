import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  primary: string;
  primaryDark: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderMedium: string;
  success: string;
  successLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;
  accent: {
    hive: string;
    hiveLight: string;
    queen: string;
    queenLight: string;
    nuclei: string;
    nucleiLight: string;
    sale: string;
    saleLight: string;
    finance: string;
    financeLight: string;
  };
}

const lightColors: ThemeColors = {
  primary: '#F5A623',
  primaryDark: '#8B6914',
  background: '#FAF8F3',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#F3F0EB',
  borderMedium: '#E8E5E0',
  success: '#22C55E',
  successLight: '#DCFCE7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  accent: {
    hive: '#F59E0B',
    hiveLight: '#FEF3C7',
    queen: '#F97316',
    queenLight: '#FFEDD5',
    nuclei: '#8B5CF6',
    nucleiLight: '#EDE9FE',
    sale: '#22C55E',
    saleLight: '#DCFCE7',
    finance: '#6366F1',
    financeLight: '#E0E7FF',
  },
};

const darkColors: ThemeColors = {
  primary: '#F5A623',
  primaryDark: '#D4941E',
  background: '#121212',
  surface: '#1E1E1E',
  textPrimary: '#F5F5F5',
  textSecondary: '#A0A0A0',
  textMuted: '#6B6B6B',
  border: '#2A2A2A',
  borderMedium: '#333333',
  success: '#4ADE80',
  successLight: '#14532D',
  danger: '#F87171',
  dangerLight: '#7F1D1D',
  info: '#60A5FA',
  infoLight: '#1E3A5F',
  accent: {
    hive: '#F59E0B',
    hiveLight: '#422006',
    queen: '#F97316',
    queenLight: '#431407',
    nuclei: '#A78BFA',
    nucleiLight: '#2E1065',
    sale: '#4ADE80',
    saleLight: '#14532D',
    finance: '#818CF8',
    financeLight: '#1E1B4B',
  },
};

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@pcelinjak_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode }}>
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
