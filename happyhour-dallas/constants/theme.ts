export const COLORS = {
  orange: '#FF6B1A',
  amber: '#FFB347',
  gold: '#E8A830',
  dark: '#1A0A00',
  card: '#2A1500',
  surface: '#221000',
  cream: '#FFF8F0',
  muted: '#8A6A50',
  faded: 'rgba(255,248,240,0.4)',

  border: {
    subtle: 'rgba(255,107,26,0.12)',
    default: 'rgba(255,107,26,0.20)',
    strong: 'rgba(255,107,26,0.35)',
  },

  overlay: {
    orange10: 'rgba(255,107,26,0.10)',
    orange15: 'rgba(255,107,26,0.15)',
    orange20: 'rgba(255,107,26,0.20)',
    inputBg: 'rgba(255,248,240,0.06)',
  },

  status: {
    success: '#34C759',
    warning: '#FFB347',
    error: '#FF3B30',
    info: '#0A84FF',
  },

  tabBar: {
    bg: 'rgba(20,6,0,0.98)',
    active: '#FF6B1A',
    inactive: 'rgba(255,248,240,0.35)',
  },
} as const;

export const FONTS = {
  playfair: 'PlayfairDisplay_900Black',
  dmRegular: 'DMSans_400Regular',
  dmMedium: 'DMSans_500Medium',
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;
