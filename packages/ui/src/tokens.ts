/**
 * Raw design tokens - source of truth across Web, Tauri Desktop, and React Native
 */

export const colors = {
  // Baseline / Obsidian Dark
  bg: '#0a0a0c',
  bg0: '#0a0a0c',
  bg1: '#111114',
  bg2: '#18181c',
  bg3: '#1f1f24',
  bgCard: '#121215',
  bgCardHover: '#18181d',
  bgCardActive: '#222228',
  border: '#2a2a30',
  borderSubtle: '#1e1e24',
  borderLight: '#3f3f46',
  text: '#f4f4f5',
  text0: '#e2ded6',
  text1: '#b0aca4',
  text2: '#706c66',
  text3: '#4a4844',
  textMuted: '#a1a1aa',
  textDim: '#71717a',

  // Accents & Signals
  accent: '#c49368',
  accentHover: '#d4a478',
  accentDim: 'rgba(196, 147, 104, 0.12)',
  accentMuted: 'rgba(224, 169, 109, 0.15)',
  teal: '#6a9e9e',
  tealDim: 'rgba(106, 158, 158, 0.12)',
  warm: '#a08060',
  redSoft: '#b05050',
  greenSoft: '#6a9a6a',
  danger: '#ef4444',
  success: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',

  // Sticky Note Themes
  sticky1: '#e8e0b8',
  sticky2: '#e0c8c0',
  sticky3: '#c0d0d8',
  sticky4: '#c8d8c0',
} as const;

export const themePalettes = {
  default: {
    name: 'Amber Baseline',
    accent: '#c49368',
    bg0: '#0a0a0c',
    bg1: '#111114',
    bg2: '#18181c',
    border: '#2a2a30',
  },
  citlali: {
    name: 'Citlali Star-Gaze',
    accent: '#f2a9c8',
    bg0: '#090d1d',
    bg1: '#10172d',
    bg2: '#172343',
    border: '#334879',
  },
  furina: {
    name: 'Furina Hydro-Overture',
    accent: '#5ab2ff',
    bg0: '#060d16',
    bg1: '#0b1624',
    bg2: '#122238',
    border: '#1f3c5e',
  },
} as const;

export const typography = {
  fontMono: 'IBMPlexMono_400Regular',
  fontMonoLight: 'IBMPlexMono_300Light',
  fontMonoMedium: 'IBMPlexMono_500Medium',
  fontMonoBold: 'IBMPlexMono_600SemiBold',
  fontSans: 'IBMPlexSans_400Regular',
  fontSansLight: 'IBMPlexSans_300Light',
  fontSansMedium: 'IBMPlexSans_500Medium',
  fontSansBold: 'IBMPlexSans_600SemiBold',
  fontJp: 'NotoSansJP_400Regular',
  fontJpMedium: 'NotoSansJP_500Medium',
  fontJpBold: 'NotoSansJP_700Bold',

  webMono: "'IBM Plex Mono', monospace",
  webSans: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  webJp: "'Noto Sans JP', sans-serif",
} as const;

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 10,
  full: 9999,
} as const;

/**
 * CSS Variable references for DOM & Tauri Webview contexts
 */
export const cssTokens = {
  colors: {
    bg0: 'var(--kz-bg-0)',
    bg1: 'var(--kz-bg-1)',
    bg2: 'var(--kz-bg-2)',
    bg3: 'var(--kz-bg-3)',
    border: 'var(--kz-border)',
    borderSubtle: 'var(--kz-border-subtle)',
    borderLight: 'var(--kz-border-light)',
    text0: 'var(--kz-text-0)',
    text1: 'var(--kz-text-1)',
    text2: 'var(--kz-text-2)',
    text3: 'var(--kz-text-3)',
    accent: 'var(--kz-accent)',
    accentHover: 'var(--kz-accent-hover)',
    accentDim: 'var(--kz-accent-dim)',
    teal: 'var(--kz-teal)',
    tealDim: 'var(--kz-teal-dim)',
    warm: 'var(--kz-warm)',
    redSoft: 'var(--kz-red-soft)',
    greenSoft: 'var(--kz-green-soft)',
    blue: 'var(--kz-blue)',
    purple: 'var(--kz-purple)',
  },
  typography: {
    mono: 'var(--kz-mono)',
    sans: 'var(--kz-sans)',
    jp: 'var(--kz-jp)',
  },
  radius: {
    sm: 'var(--kz-radius-sm)',
    md: 'var(--kz-radius-md)',
    lg: 'var(--kz-radius-lg)',
  },
} as const;

export const tokens = cssTokens;

export type ThemeName = 'default' | 'citlali' | 'furina';
