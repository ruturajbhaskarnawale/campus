export const COLORS = {
  primary: '#6200ea', // Deep Violet
  primaryGradient: ['#6200ea', '#b388ff'],
  secondary: '#00d4ff', // Cyan
  secondaryGradient: ['#00d4ff', '#007cf0'],
  success: '#00e676',
  error: '#ff1744',
  border: '#e0e0e0', // Added border
  warning: '#ff9800', // Added warning
  text: {
    primary: '#1a1a1a',
    secondary: '#757575',
    tertiary: '#9e9e9e', // Added tertiary
    light: '#ffffff',
  },
  background: {
    primary: '#f8f9fa', // Added alias
    secondary: '#ffffff', // Added alias
    tertiary: '#f1f3f4', // Added tertiary
    light: '#f8f9fa',
    card: '#ffffff',
    dark: '#121212',
  },
  glass: {
    light: 'rgba(255, 255, 255, 0.6)',
    dark: 'rgba(20, 20, 20, 0.6)',
    border: 'rgba(255, 255, 255, 0.2)',
  }
};

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
