import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../design/Theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
  setMode: (mode) => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  // Load saved preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (e) {
        console.log('Failed to load theme preference');
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    AsyncStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const setMode = (mode) => {
    setIsDark(mode === 'dark');
    AsyncStorage.setItem('theme', mode);
  };

  // Select colors based on mode
  // Note: We are ignoring the static export COLORS in this context consumer
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
