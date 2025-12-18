const PALETTE = {
  deepViolet: '#6200ea',
  softViolet: '#b388ff',
  cyan: '#00d4ff',
  blue: '#007cf0',
  green: '#00e676',
  red: '#ff1744',
  orange: '#ff9800',
  grey100: '#f8f9fa',
  grey200: '#f1f3f4',
  grey300: '#e0e0e0',
  grey600: '#9e9e9e',
  grey700: '#757575',
  grey900: '#1a1a1a',
  black: '#121212',
  white: '#ffffff',
};

export const lightColors = {
  primary: PALETTE.deepViolet,
  primaryGradient: [PALETTE.deepViolet, PALETTE.softViolet],
  secondary: PALETTE.cyan,
  secondaryGradient: [PALETTE.cyan, PALETTE.blue],
  success: PALETTE.green,
  error: PALETTE.red,
  warning: PALETTE.orange,
  border: PALETTE.grey300,
  text: {
    primary: PALETTE.grey900,
    secondary: PALETTE.grey700,
    tertiary: PALETTE.grey600,
    light: PALETTE.white,
  },
  background: {
    primary: PALETTE.grey100,
    secondary: PALETTE.white,
    tertiary: PALETTE.grey200,
    card: PALETTE.white,
  },
  glass: {
     bg: 'rgba(255, 255, 255, 0.6)',
     border: 'rgba(255, 255, 255, 0.2)',
  }
};

export const darkColors = {
  primary: PALETTE.softViolet, // Lighter for dark mode
  primaryGradient: [PALETTE.softViolet, PALETTE.deepViolet],
  secondary: PALETTE.cyan,
  secondaryGradient: [PALETTE.cyan, PALETTE.blue],
  success: PALETTE.green,
  error: PALETTE.red,
  warning: PALETTE.orange,
  border: '#333333',
  text: {
    primary: '#ffffff',
    secondary: '#b3b3b3',
    tertiary: '#757575',
    light: PALETTE.grey900,
  },
  background: {
    primary: '#000000',
    secondary: '#121212',
    tertiary: '#1e1e1e',
    card: '#1e1e1e',
  },
  glass: {
     bg: 'rgba(20, 20, 20, 0.6)',
     border: 'rgba(255, 255, 255, 0.1)',
  }
};

// Default export for legacy support
export const COLORS = lightColors;

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  round: 9999,
};

export const FONTS = {
  h1: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700', letterSpacing: -0.25 },
  h3: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 12, fontWeight: '400', color: '#888' },
};

export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: '#6200ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
};
