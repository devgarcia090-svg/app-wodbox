export const Colors = {
  black: '#0a0a0a',
  surface: '#141414',
  surface2: '#1e1e1e',
  surface3: '#2a2a2a',
  border: '#2f2f2f',
  orange: '#f95c00',
  orangeDim: '#c44800',
  orangeGlow: 'rgba(249,92,0,0.15)',
  white: '#f5f5f5',
  muted: '#888888',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#f59e0b',
  blue: '#3b82f6',
  greenBg: 'rgba(34,197,94,0.15)',
  redBg: 'rgba(239,68,68,0.15)',
  yellowBg: 'rgba(245,158,11,0.15)',
  blueBg: 'rgba(59,130,246,0.15)',
};

export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
