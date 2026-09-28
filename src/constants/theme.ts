import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111418',
    textSecondary: '#60646C',
    background: '#F4F3EF',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E6E4DD',
    border: '#D9D6CE',
    accent: '#0F6E62',
    accentText: '#FFFFFF',
    danger: '#C4372B',
    canvas: '#F4F3EF',
    node: '#FFFFFF',
    edge: '#8A8F98',
    scrim: 'rgba(0,0,0,0.35)',
  },
  dark: {
    text: '#F2F2F0',
    textSecondary: '#A4A8AF',
    background: '#0E1011',
    backgroundElement: '#1B1E20',
    backgroundSelected: '#2A2E31',
    border: '#33383C',
    accent: '#3FB8A5',
    accentText: '#0E1011',
    danger: '#FF6B5E',
    canvas: '#0E1011',
    node: '#1B1E20',
    edge: '#6B7178',
    scrim: 'rgba(0,0,0,0.55)',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof ThemeColors;

// Origin tints: distinct hues, readable with dark text in light mode and light text in dark mode.
export const OriginPalette = {
  light: ['#F6C667', '#8CC7E8', '#F29E8E', '#A8D5A2', '#C9B3E6', '#F5B3D0', '#9ED9D0'],
  dark: ['#8A6A1F', '#2E6A8C', '#8C3E31', '#3E6B39', '#5B4682', '#86405F', '#2F7A70'],
  other: { light: '#D6D2C8', dark: '#3A3F43' },
  unknown: { light: '#FFFFFF', dark: '#1B1E20' },
};

export const Fonts = Platform.select({
  ios: { rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { rounded: 'normal', mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
