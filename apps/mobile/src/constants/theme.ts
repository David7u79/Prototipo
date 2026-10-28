import { DarkTheme, type Theme } from 'expo-router';

// ponytail: dark-only palette (app.json forces "dark"); add a light set + useColorScheme if users ask for it.
export const colors = {
  background: '#0E0F11',
  surface: '#17191C',
  surfaceRaised: '#202328',
  text: '#F4F5F2',
  muted: '#9AA09B',
  border: '#2A2E33',
  accent: '#C6F432',
  onAccent: '#0E0F11',
  accentSoft: '#2A3410',
  danger: '#FF5A4E',
};

export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};
