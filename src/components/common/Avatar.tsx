import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Fonts } from '../../theme/fonts';

interface AvatarProps {
  url?: string | null;
  initials: string;
  color: string;
  size?: number;
  fontSize?: number;
  borderColor?: string;
  borderWidth?: number;
}

export function Avatar({ url, initials, color, size = 40, fontSize = 13, borderColor, borderWidth }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
    ...(borderColor ? { borderWidth: borderWidth ?? 2, borderColor } : {}),
  };

  if (url && !imgError) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: url }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize, color: '#fff' }}>
        {initials}
      </Text>
    </View>
  );
}
