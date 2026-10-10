// Design tokens from docs/handoff/README.md.
export const colors = {
  gold: '#F2AD32',
  forest: '#123D2B',
  forestDark: '#0B2A1D',
  cream: '#FFF9F0',
  card: '#FFFFFF',
  cardBorder: '#EFE6D7',
  inputBorder: '#E6DCCB',
  outline: '#D6CAB5',
  text: '#242424',
  muted: '#6B6259',
  secondary: '#4A433C',
  onForestMuted: '#D8D0C2',
  onForestSubtle: '#C9D6CE',
  success: '#16A365',
  markPaid: '#0E7A4C',
  segmentBg: '#F1E8D8',
  selectedBg: '#EEF4F0',
  radioIdle: '#A89C89',
  placeholderImg: '#E6DCCB',
  soldOutCard: '#F4EEE4',
  divider: '#EFE6D7',
  hairline: '#F3ECE0',
  track: '#F3ECE0',
  switchOff: '#CFC3AF',
  danger: '#A3302B',
  dangerText: '#8A2A25',
  dangerDeep: '#6E211D',
  dangerBorder: '#E7A39F',
  removeText: '#8A3B33',
  outstanding: '#A3302B',
  unpaidBar: '#F4C9C6',
  collected: '#0E6B42',
  avatarChef: '#F2AD32',
} as const;

export type Tone = 'paid' | 'unpaid' | 'pending' | 'preparing' | 'new' | 'neutral';

// Status badge background / text pairs.
export const tones: Record<Tone, { bg: string; fg: string }> = {
  paid: { bg: '#DDF3E8', fg: '#0E6B42' },
  unpaid: { bg: '#FDE3E2', fg: '#8A2A25' },
  pending: { bg: '#FDEBC8', fg: '#6B4700' },
  preparing: { bg: '#E3ECF7', fg: '#1F4E86' },
  new: { bg: '#E2ECE7', fg: '#123D2B' },
  neutral: { bg: '#EFE6D7', fg: '#4A433C' },
};

export const radius = { input: 12, button: 14, card: 16, cardLg: 20, hero: 24, pill: 999 } as const;

export const fonts = {
  400: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
  script: 'GreatVibes_400Regular',
} as const;

export type Weight = 400 | 500 | 600 | 700 | 800;

export const shadow = {
  card: { boxShadow: '0 2px 10px rgba(36, 36, 36, 0.06)' },
  raised: { boxShadow: '0 6px 24px rgba(36, 36, 36, 0.08)' },
} as const;
