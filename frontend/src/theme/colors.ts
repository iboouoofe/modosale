import { Theme } from '@react-navigation/native';

export const COLORS = {
  darkBg: '#121212',
  darkCard: '#1E1E1E',
  darkInput: '#2A2A2A',
  darkBorder: '#333333',
  neonAccent: '#DEFF9A',
  neonHover: '#CDFA73',
  textLight: '#F3F4F6',
  textMuted: '#9CA3AF',
  textMutedDark: '#6B7280',
  white: '#FFFFFF',
};

export const ModsaleDarkTheme: Theme = {
  dark: true,
  colors: {
    primary: COLORS.neonAccent,
    background: COLORS.darkBg,
    card: COLORS.darkCard,
    text: COLORS.textLight,
    border: COLORS.darkBorder,
    notification: COLORS.neonAccent,
  },
};
