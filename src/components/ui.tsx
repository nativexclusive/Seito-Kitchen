import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, shadow, tones, type Tone, type Weight } from '../theme';
import { BackIcon, CheckIcon } from './icons';

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
type TProps = TextProps & {
  size?: number;
  weight?: Weight;
  color?: string;
  align?: TextStyle['textAlign'];
  lineHeight?: number;
  script?: boolean;
};

export function T({ size = 14, weight = 400, color = colors.text, align, lineHeight, script, style, ...rest }: TProps) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: script ? fonts.script : fonts[weight], fontSize: size, color, textAlign: align },
        lineHeight ? { lineHeight: size * lineHeight } : null,
        style,
      ]}
    />
  );
}

export function Wordmark({ size = 26, color = colors.forest }: { size?: number; color?: string }) {
  return (
    <T script size={size} color={color} style={{ lineHeight: size * 1.15 }} accessibilityRole="header">
      Mama's Kitchen
    </T>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
type Variant = 'primary' | 'forest' | 'outline' | 'outlineForest' | 'outlineDanger' | 'paid' | 'danger' | 'onForest' | 'white' | 'link';

const variantStyle: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.gold, fg: colors.text },
  forest: { bg: colors.forest, fg: colors.cream },
  outline: { bg: 'transparent', fg: colors.text, border: colors.outline },
  outlineForest: { bg: 'transparent', fg: colors.forest, border: colors.forest },
  outlineDanger: { bg: 'transparent', fg: colors.dangerText, border: colors.dangerBorder },
  paid: { bg: colors.markPaid, fg: '#FFFFFF' },
  danger: { bg: colors.danger, fg: '#FFFFFF' },
  onForest: { bg: 'transparent', fg: colors.cream, border: 'rgba(255, 249, 240, 0.5)' },
  white: { bg: '#FFFFFF', fg: colors.text, border: colors.outline },
  link: { bg: 'transparent', fg: colors.forest },
};

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label?: string;
  children?: ReactNode;
  variant?: Variant;
  height?: number;
  size?: number;
  weight?: Weight;
  rounded?: number;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  left?: ReactNode;
};

export function Button({
  label,
  children,
  variant = 'primary',
  height = 52,
  size = 16,
  weight = 700,
  rounded = radius.button,
  loading,
  disabled,
  style,
  left,
  ...rest
}: ButtonProps) {
  const v = variantStyle[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      {...rest}
      style={({ pressed }) => [
        {
          minHeight: Math.max(44, height),
          borderRadius: rounded,
          backgroundColor: v.bg,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: variant === 'link' ? 0 : 16,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : left}
      {label !== undefined ? (
        <T size={size} weight={weight} color={v.fg} align="center">
          {label}
        </T>
      ) : (
        children
      )}
    </Pressable>
  );
}

export function BackButton({ onPress, fallback = '/' }: { onPress?: () => void; fallback?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace(fallback as never)))}
      style={{ width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' }}
    >
      <BackIcon />
    </Pressable>
  );
}

export function ScreenTitle({ title, size = 22, back = true, fallback, right }: { title: string; size?: number; back?: boolean; fallback?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {back ? <BackButton fallback={fallback} /> : null}
      <T size={size} weight={800} style={{ flex: 1 }} accessibilityRole="header">
        {title}
      </T>
      {right}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------
export function Card({ children, style, bordered = false, raised = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; bordered?: boolean; raised?: boolean }) {
  return (
    <View
      style={[
        { backgroundColor: colors.card, borderRadius: radius.card, padding: 16, gap: 10 },
        bordered ? { borderWidth: 1, borderColor: colors.cardBorder } : raised ? shadow.raised : shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Badge({ label, tone, size = 12, style }: { label: string; tone: Tone; size?: number; style?: StyleProp<ViewStyle> }) {
  const t = tones[tone];
  return (
    <View style={[{ alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: t.bg }, style]}>
      <T size={size} weight={700} color={t.fg}>
        {label}
      </T>
    </View>
  );
}

export function Notice({ children, tone = 'new', style }: { children: ReactNode; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  const t = tones[tone];
  return (
    <View accessibilityRole="alert" style={[{ padding: 14, borderRadius: radius.input, backgroundColor: t.bg }, style]}>
      {typeof children === 'string' ? (
        <T size={14} weight={600} color={t.fg} lineHeight={1.5}>
          {children}
        </T>
      ) : (
        children
      )}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.divider }} />;
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

/** Side-by-side form fields of equal width. */
export function FieldRow({ children }: { children: ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      {items.map((c, i) => (
        <View key={i} style={{ flex: 1, minWidth: 0 }}>
          {c}
        </View>
      ))}
    </View>
  );
}

export function Grid({ children, columns = 2, gap = 10 }: { children: ReactNode; columns?: number; gap?: number }) {
  const items = (Array.isArray(children) ? children.flat() : [children]).filter((c) => c !== null && c !== undefined && c !== false);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {Array.from({ length: columns }, (_, c) => (
            <View key={c} style={{ flex: 1, minWidth: 0 }}>
              {row[c] ?? null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <T size={strong ? 18 : 14} weight={strong ? 800 : 400} color={strong ? colors.text : colors.secondary}>
        {label}
      </T>
      <T size={strong ? 18 : 14} weight={strong ? 800 : 400} color={strong ? colors.text : colors.secondary}>
        {value}
      </T>
    </Row>
  );
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
export const inputStyle: TextStyle = {
  minHeight: 48,
  paddingHorizontal: 14,
  borderRadius: radius.input,
  borderWidth: 1.5,
  borderColor: colors.inputBorder,
  backgroundColor: '#FFFFFF',
  fontFamily: fonts[500],
  fontSize: 15,
  color: colors.text,
};

export function Field({ label, style, multiline, ...rest }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 4, minWidth: 0 }}>
      <T size={13} weight={600} nativeID={`label-${label}`}>
        {label}
      </T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9A9083"
        multiline={multiline}
        style={[inputStyle, multiline ? { minHeight: 84, paddingTop: 12, textAlignVertical: 'top', fontFamily: fonts[400], fontSize: 14 } : null, style]}
        {...rest}
      />
    </View>
  );
}

/** Radio / checkbox row used for protein and add-on choices. */
export function ChoiceRow({ label, detail, selected, kind, onPress }: { label: string; detail: string; selected: boolean; kind: 'radio' | 'check'; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole={kind === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        height: 50,
        paddingHorizontal: 14,
        borderRadius: radius.input,
        borderWidth: 1.5,
        borderColor: selected ? colors.forest : colors.inputBorder,
        backgroundColor: selected ? colors.selectedBg : '#FFFFFF',
      }}
    >
      {kind === 'radio' ? (
        <View style={{ width: 20, height: 20, borderRadius: 999, borderWidth: selected ? 6 : 2, borderColor: selected ? colors.forest : colors.radioIdle, backgroundColor: '#FFFFFF' }} />
      ) : (
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: selected ? colors.forest : colors.radioIdle,
            backgroundColor: selected ? colors.forest : '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? <CheckIcon size={12} strokeWidth={3.5} /> : null}
        </View>
      )}
      <T size={14} weight={600} style={{ flex: 1 }}>
        {label}
      </T>
      <T size={14} weight={600}>
        {detail}
      </T>
    </Pressable>
  );
}

/** Two-line tile choice (portion size, payment method). */
export function ChoiceTile({ label, detail, selected, onPress, height = 50 }: { label: string; detail?: string; selected: boolean; onPress: () => void; height?: number }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        height,
        borderRadius: radius.input,
        borderWidth: 1.5,
        borderColor: selected ? colors.forest : colors.inputBorder,
        backgroundColor: selected ? colors.selectedBg : '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <T size={14} weight={700}>
        {label}
      </T>
      {detail ? (
        <T size={12} weight={500} color={colors.muted}>
          {detail}
        </T>
      ) : null}
    </Pressable>
  );
}

/** Pill-shaped segmented control on a sand background (Pickup / Delivery). */
export function Segmented<K extends string>({ options, value, onChange, scroll }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; scroll?: boolean }) {
  const body = options.map((o) => {
    const on = o.key === value;
    return (
      <Pressable
        key={o.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        onPress={() => onChange(o.key)}
        style={[
          { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
          scroll ? null : { flex: 1 },
          on ? (scroll ? { backgroundColor: colors.gold } : { backgroundColor: '#FFFFFF', boxShadow: '0 1px 4px rgba(36,36,36,0.12)' }) : null,
        ]}
      >
        <T size={scroll ? 13 : 14} weight={700}>
          {o.label}
        </T>
      </Pressable>
    );
  });
  const frame: ViewStyle = { flexDirection: 'row', gap: 6, padding: 4, borderRadius: radius.button, backgroundColor: colors.segmentBg };
  return scroll ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, borderRadius: radius.button, backgroundColor: colors.segmentBg }}
      contentContainerStyle={{ flexDirection: 'row', gap: 6, padding: 4 }}
      accessibilityRole="tablist"
    >
      {body}
    </ScrollView>
  ) : (
    <View style={frame} accessibilityRole="tablist">
      {body}
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={{ width: 50, height: 30, borderRadius: 999, padding: 3, backgroundColor: value ? colors.forest : colors.switchOff, alignItems: value ? 'flex-end' : 'flex-start' }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: '#FFFFFF' }} />
    </Pressable>
  );
}

export function Stepper({ value, onChange, min = 1, max = 20, size = 'large' }: { value: number; onChange: (n: number) => void; min?: number; max?: number; size?: 'large' | 'small' }) {
  const h = size === 'large' ? 48 : 34;
  const w = size === 'large' ? 42 : 36;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: size === 'large' ? 14 : 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" disabled={value <= min} onPress={() => onChange(Math.max(min, value - 1))} style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
        <T size={size === 'large' ? 18 : 16} weight={700} color={value <= min ? colors.switchOff : colors.text}>
          −
        </T>
      </Pressable>
      <T size={14} weight={800} align="center" style={{ minWidth: 20 }} accessibilityLiveRegion="polite">
        {value}
      </T>
      <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" disabled={value >= max} onPress={() => onChange(Math.min(max, value + 1))} style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
        <T size={size === 'large' ? 18 : 16} weight={700} color={value >= max ? colors.switchOff : colors.text}>
          +
        </T>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen shell
// ---------------------------------------------------------------------------
type ScreenProps = {
  children: ReactNode;
  /** Color behind the status bar / notch. */
  topColor?: string;
  footer?: ReactNode;
  footerBg?: string;
  padded?: boolean;
  gap?: number;
  scroll?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  contentStyle?: StyleProp<ViewStyle>;
};

// Content is capped at phone width and centered, so the same screens work as the
// responsive web ordering site.
export const MAX_WIDTH = 520;

export function Screen({ children, topColor = colors.cream, footer, footerBg = colors.cream, padded = true, gap = 16, scroll = true, refreshControl, contentStyle }: ScreenProps) {
  const content = [{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap }, padded ? { paddingHorizontal: 20, paddingBottom: 28 } : null, contentStyle] as StyleProp<ViewStyle>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: topColor }} />
      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" refreshControl={refreshControl}>
          <View style={content}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, content]}>{children}</View>
      )}
      {footer ? (
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: footerBg, borderTopWidth: 1, borderTopColor: colors.divider }}>
          <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>{footer}</View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator color={colors.forest} />
      <T size={13} color={colors.muted}>
        {label}
      </T>
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ padding: 28, borderRadius: radius.card, backgroundColor: '#FFFFFF', alignItems: 'center', gap: 12 }}>
      <T size={15} weight={700} align="center">
        {title}
      </T>
      {body ? (
        <T size={13} color={colors.muted} align="center" lineHeight={1.5}>
          {body}
        </T>
      ) : null}
      {action}
    </View>
  );
}

export const styles = StyleSheet.create({
  sectionTitle: { fontFamily: fonts[800], fontSize: 17, color: colors.text },
});
