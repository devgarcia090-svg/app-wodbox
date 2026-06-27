export const Colors = {
  black: '#0f1623',
  surface: '#1a2235',
  surface2: '#202d42',
  surface3: '#283450',
  border: '#2d3f5c',
  orange: '#f95c00',
  orangeDim: '#c44800',
  orangeGlow: 'rgba(249,92,0,0.15)',
  white: '#F8FAFC',
  muted: '#94A3B8',
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
