import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

type BadgeVariant = 'green' | 'red' | 'yellow' | 'orange' | 'blue';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  small?: boolean;
}

const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
  green: { bg: Colors.greenBg, color: Colors.green },
  red: { bg: Colors.redBg, color: Colors.red },
  yellow: { bg: Colors.yellowBg, color: Colors.yellow },
  orange: { bg: Colors.orangeGlow, color: Colors.orange },
  blue: { bg: Colors.blueBg, color: Colors.blue },
};

export function Badge({ label, variant, small }: BadgeProps) {
  const s = BADGE_STYLES[variant];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.color }, small && styles.small]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  text: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
  },
  small: {
    fontSize: 10,
  },
});
