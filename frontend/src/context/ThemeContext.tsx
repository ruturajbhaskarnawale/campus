import React, { createContext, useState, useMemo, useContext } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Theme = 'light' | 'dark' | 'system';

const ThemeContext = createContext({
  theme: 'light' as Theme,
  setTheme: (t: Theme) => {},
  toggle: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const system = useColorScheme() ?? 'light';
  const [theme, setTheme] = useState<Theme>('system');

  const resolvedTheme = theme === 'system' ? system : theme;

  const value = useMemo(() => ({
    theme: resolvedTheme,
    setTheme,
    toggle: () => setTheme((t: Theme) => (t === 'dark' ? 'light' : 'dark')),
  }), [resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
