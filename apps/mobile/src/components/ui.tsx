import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors, gradients, radius, space, type } from '@/constants/theme';

export type SymbolName = ComponentProps<typeof SymbolView>['name'];
type Tone = 'accent' | 'metric' | 'success' | 'danger' | 'neutral';

const toneColors: Record<Tone, { fg: string; bg: string }> = {
  accent: { fg: colors.accent, bg: colors.accentSoft },
  metric: { fg: colors.metric, bg: colors.metricSoft },
  success: { fg: colors.success, bg: colors.successSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  neutral: { fg: colors.muted, bg: colors.surfaceRaised },
};

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Kept for existing callers; same as `variant="secondary"`. */
  secondary?: boolean;
  /** Kept for existing callers; same as `variant="danger"`. */
  danger?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: SymbolName;
};

export function Screen({ children }: PropsWithChildren) {
  return <View style={uiStyles.screen}>{children}</View>;
}

export function Title({ children }: PropsWithChildren) {
  return <Text style={uiStyles.title}>{children}</Text>;
}

/** Small uppercase caption above a field or a group. */
export function Label({ children }: PropsWithChildren) {
  return <Text style={uiStyles.label}>{children}</Text>;
}

export function Icon({ name, size = 20, color = colors.text }: { name: SymbolName; size?: number; color?: string }) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  const input = (
    <TextInput
      placeholderTextColor={colors.subtle}
      selectionColor={colors.accent}
      accessibilityLabel={label ?? props.placeholder}
      style={uiStyles.field}
      {...props}
    />
  );
  if (!label) return input;
  return (
    <View style={uiStyles.fieldGroup}>
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
  variant,
  icon,
}: ButtonProps) {
  const kind = variant ?? (danger ? 'danger' : secondary ? 'secondary' : 'primary');
  const fg = kind === 'primary' ? colors.onAccent : kind === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        uiStyles.button,
        kind === 'secondary' && uiStyles.secondaryButton,
        kind === 'ghost' && uiStyles.ghostButton,
        kind === 'danger' && uiStyles.dangerButton,
        pressed && uiStyles.pressed,
        disabled && uiStyles.dimmed,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={[uiStyles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  hero = false,
}: PropsWithChildren<{ style?: ViewStyle; hero?: boolean }>) {
  return <View style={[uiStyles.card, hero && uiStyles.heroCard, style]}>{children}</View>;
}

/** Big number with a caption, for dashboard tiles. */
export function Stat({
  value,
  label,
  unit,
  tone = 'metric',
}: {
  value: string | number;
  label: string;
  unit?: string;
  tone?: Tone;
}) {
  return (
    <View style={uiStyles.stat}>
      <Text style={[uiStyles.statValue, { color: toneColors[tone].fg }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {unit ? <Text style={uiStyles.statUnit}> {unit}</Text> : null}
      </Text>
      <Label>{label}</Label>
    </View>
  );
}

/** Title row for a group of content, with an optional trailing link. */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={uiStyles.sectionHeader}>
      <Text style={uiStyles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12}>
          <Text style={uiStyles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Tappable list row: leading icon, title/subtitle, trailing value and chevron. */
export function ListRow({
  title,
  subtitle,
  icon,
  tone = 'accent',
  trailing,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon?: SymbolName;
  tone?: Tone;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const body = (
    <>
      {icon ? (
        <View style={[uiStyles.rowIcon, { backgroundColor: toneColors[tone].bg }]}>
          <Icon name={icon} size={20} color={toneColors[tone].fg} />
        </View>
      ) : null}
      <View style={uiStyles.rowText}>
        <Text style={uiStyles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={uiStyles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {typeof trailing === 'string' ? <Text style={uiStyles.rowTrailing}>{trailing}</Text> : trailing}
      {onPress ? <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={18} color={colors.subtle} /> : null}
    </>
  );
  if (!onPress) return <View style={uiStyles.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [uiStyles.row, pressed && uiStyles.pressed]}
    >
      {body}
    </Pressable>
  );
}

/** Small rounded label: status, tag, filter. Pressable when `onPress` is given. */
export function Chip({
  label,
  tone = 'neutral',
  selected = false,
  onPress,
}: {
  label: string;
  tone?: Tone;
  selected?: boolean;
  onPress?: () => void;
}) {
  const t = toneColors[selected ? 'accent' : tone];
  const style = [
    uiStyles.chip,
    { backgroundColor: t.bg, borderColor: selected ? colors.accent : 'transparent' },
  ];
  const text = <Text style={[uiStyles.chipText, { color: t.fg }]}>{label}</Text>;
  if (!onPress) return <View style={style}>{text}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && uiStyles.pressed]}
    >
      {text}
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: SymbolName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={uiStyles.empty}>
      <View style={uiStyles.emptyIcon}>
        <Icon name={icon} size={28} color={colors.accent} />
      </View>
      <Text style={uiStyles.headline}>{title}</Text>
      {message ? <Text style={[uiStyles.muted, uiStyles.center]}>{message}</Text> : null}
      {action}
    </View>
  );
}

export const uiStyles = StyleSheet.create({
  screen: { flex: 1, gap: space.lg, padding: 20, backgroundColor: colors.background },
  scroll: { gap: space.lg, padding: 20, paddingBottom: 120 },
  title: { color: colors.text, ...type.display },
  headline: { color: colors.text, ...type.headline },
  muted: { color: colors.muted, ...type.body },
  center: { textAlign: 'center' },
  label: { color: colors.muted, ...type.caption },
  fieldGroup: { gap: 6 },
  field: {
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: radius.md,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 17,
  },
  button: {
    minHeight: 54,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: radius.md,
    experimental_backgroundImage: gradients.primary,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    experimental_backgroundImage: 'none',
  },
  ghostButton: { backgroundColor: 'transparent', experimental_backgroundImage: 'none' },
  dangerButton: {
    backgroundColor: colors.dangerSoft,
    experimental_backgroundImage: 'none',
  },
  buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  secondaryButtonText: { color: colors.text },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  dimmed: { opacity: 0.45 },
  card: {
    gap: space.sm,
    padding: space.lg,
    borderWidth: 1,
    borderRadius: radius.lg,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  heroCard: { experimental_backgroundImage: gradients.hero, borderColor: '#3A2F86' },
  stat: { flex: 1, gap: 2 },
  statValue: { color: colors.metric, ...type.metric },
  statUnit: { fontSize: 15, fontWeight: '600', color: colors.muted, letterSpacing: 0 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  sectionTitle: { color: colors.text, ...type.title },
  sectionAction: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSubtitle: { color: colors.muted, fontSize: 13 },
  rowTrailing: { color: colors.metric, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginBottom: space.sm,
  },
});
