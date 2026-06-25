import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useBoxConfig } from '../../context/BoxConfigContext';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  small?: boolean;
  full?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function Button({ label, variant = 'primary', small, full, onPress, style }: ButtonProps) {
  const { primary_color } = useBoxConfig();

  const dynamicBtnStyle =
    variant === 'primary' ? { backgroundColor: primary_color } :
    variant === 'ghost'   ? { borderColor: primary_color } :
    null;

  const dynamicTextStyle =
    variant === 'ghost' ? { color: primary_color } : null;

  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], dynamicBtnStyle, small && styles.smallBtn, full && styles.full, style]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles], dynamicTextStyle, small && styles.smallText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: Colors.orange },
  secondary: { backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.border },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.orange },
  danger: { backgroundColor: Colors.redBg, borderWidth: 1, borderColor: Colors.red },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  full: { width: '100%', paddingVertical: 12 },
  text: { fontFamily: Fonts.bodySemiBold, fontSize: 13 },
  primaryText: { color: '#fff' },
  secondaryText: { color: Colors.white },
  ghostText: { color: Colors.orange },
  dangerText: { color: Colors.red },
  smallText: { fontSize: 12 },
} as any);
