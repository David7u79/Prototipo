import type { TextStyle } from 'react-native';
import { DarkTheme, type Theme } from 'expo-router';

// ponytail: dark-only palette "Aurora" (app.json forces "dark"); add a light set + useColorScheme if users ask for it.
export const colors = {
  background: '#0A0D18',
  surface: '#131829',
  surfaceRaised: '#1B2136',
  text: '#EEF1FA',
  muted: '#8A93AD',
  subtle: '#5B6480',
  border: '#232A42',
  accent: '#7C5CFF',
  onAccent: '#FFFFFF',
  accentSoft: '#211B45',
  metric: '#22D3EE',
  metricSoft: '#0E2E3A',
  success: '#34D399',
  successSoft: '#0F2E26',
  danger: '#FB7185',
  dangerSoft: '#3A1622',
};

/** Native CSS gradient (RN `experimental_backgroundImage`), no extra dependency. */
export const gradients = {
  primary: 'linear-gradient(135deg, #7C5CFF 0%, #22D3EE 100%)',
  hero: 'linear-gradient(160deg, #2A1F6B 0%, #131829 70%)',
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const type = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  headline: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  metric: { fontSize: 36, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

/** Shared header look for stack screens. */
export const headerOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' as const },
  headerShadowVisible: false,
};
