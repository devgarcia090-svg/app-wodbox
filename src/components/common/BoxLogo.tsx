import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '../../theme/fonts';
import { useBoxConfig } from '../../context/BoxConfigContext';

interface BoxLogoProps {
  size?: 'small' | 'large';
}

export function BoxLogo({ size = 'small' }: BoxLogoProps) {
  const { name, primary_color, logo_prefix, logo_highlight, logo_subtitle } = useBoxConfig();

  const isLarge = size === 'large';
  const mainSize = isLarge ? 52 : 22;
  const prefixSize = isLarge ? 16 : 9;
  const subtitleSize = isLarge ? 13 : 0;

  if (logo_highlight && name.includes(logo_highlight)) {
    const parts = name.split(logo_highlight);
    return (
      <View style={styles.wrap}>
        {logo_prefix ? (
          <Text style={[styles.prefix, { fontSize: prefixSize, color: '#fff' }]}>
            {logo_prefix}
          </Text>
        ) : null}
        <Text style={[styles.main, { fontSize: mainSize }]}>
          {parts[0]}
          <Text style={{ color: primary_color }}>{logo_highlight}</Text>
          {parts[1]}
        </Text>
        {logo_subtitle && isLarge ? (
          <Text style={[styles.subtitle, { fontSize: subtitleSize, color: primary_color }]}>
            {logo_subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  // Fallback: estilo WodBox genérico
  const half = Math.ceil(name.length / 2);
  const first = name.slice(0, half);
  const second = name.slice(half);
  return (
    <View style={styles.wrap}>
      <Text style={[styles.main, { fontSize: mainSize }]}>
        {first}<Text style={{ color: primary_color }}>{second}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  prefix: {
    fontFamily: Fonts.bodySemiBold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 4,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  main: {
    fontFamily: Fonts.headingXBold,
    color: '#fff',
    letterSpacing: 2,
    lineHeight: undefined,
  },
  subtitle: {
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
