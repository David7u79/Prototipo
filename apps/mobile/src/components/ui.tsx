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
  danger?: boolean;
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

/** Small uppercase caption above a field or a group. */
export function Label({ children }: PropsWithChildren) {
  return <Text style={getStyles().label}>{children}</Text>;
}

export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  const input = (
    <TextInput
      placeholderTextColor={colors.muted}
      selectionColor={colors.accent}
      accessibilityLabel={label ?? props.placeholder}
      style={getStyles().field}
      {...props}
    />
  );
  if (!label) return input;
  return (
    <View style={getStyles().fieldGroup}>
      <Label>{label}</Label>
      {input}
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
}: ButtonProps) {
  const styles = getStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        danger && styles.dangerButton,
        (disabled || pressed) && styles.dimmed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.secondaryButtonText,
          danger && styles.dangerButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[getStyles().card, style]}>{children}</View>;
}

/** Big number with a caption, for dashboard tiles. */
export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={getStyles().stat}>
      <Text style={getStyles().statValue}>{value}</Text>
      <Label>{label}</Label>
    </View>
  );
}

export const uiStyles = createStyles();

function createStyles() {
  return StyleSheet.create({
    screen: { flex: 1, gap: 16, padding: 20, backgroundColor: colors.background },
    title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
    muted: { color: colors.muted, fontSize: 15, lineHeight: 21 },
    label: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    fieldGroup: { gap: 6 },
    field: {
      minHeight: 52,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderWidth: 1,
      borderRadius: 14,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 17,
    },
    button: {
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
      borderRadius: 14,
      backgroundColor: colors.accent,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    dangerButton: {
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: 'transparent',
    },
    buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
    secondaryButtonText: { color: colors.text },
    dangerButtonText: { color: colors.danger },
    dimmed: { opacity: 0.5 },
    card: {
      gap: 8,
      padding: 16,
      borderWidth: 1,
      borderRadius: 18,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    stat: { flex: 1, gap: 4 },
    statValue: { color: colors.accent, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  });
}
