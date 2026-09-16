import type { PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
};

function getStyles() {
  return uiStyles;
}

export function Screen({ children }: PropsWithChildren) {
  return <View style={getStyles().screen}>{children}</View>;
}

export function Title({ children }: PropsWithChildren) {
  return <Text style={getStyles().title}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} style={getStyles().field} {...props} />;
}

export function Button({ label, onPress, disabled = false, secondary = false }: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        getStyles().button,
        secondary && getStyles().secondaryButton,
        (disabled || pressed) && getStyles().dimmed,
      ]}
    >
      <Text style={secondary ? getStyles().secondaryButtonText : getStyles().buttonText}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[getStyles().card, style]}>{children}</View>;
}

export const uiStyles = createStyles();

function createStyles() {
  return StyleSheet.create({
    screen: { flex: 1, gap: 16, padding: 20, backgroundColor: colors.background },
    title: { color: colors.text, fontSize: 28, fontWeight: '700' },
    muted: { color: colors.muted, fontSize: 15, lineHeight: 21 },
    field: {
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderWidth: 1,
      borderRadius: 12,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 16,
    },
    button: {
      alignItems: 'center',
      padding: 15,
      borderRadius: 12,
      backgroundColor: colors.accent,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.surface,
    },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    secondaryButtonText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
    dimmed: { opacity: 0.6 },
    card: {
      gap: 8,
      padding: 16,
      borderWidth: 1,
      borderRadius: 14,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
  });
}
