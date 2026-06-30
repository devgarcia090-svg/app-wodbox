import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Fonts } from '../../theme/fonts';

interface AvatarProps {
  url?: string | null;
  initials: string;
  color: string;
  size?: number;
  fontSize?: number;
  borderColor?: string;
  borderWidth?: number;
  square?: boolean;
  onPress?: () => void;
}

export function Avatar({
  url, initials, color, size = 40, fontSize = 13,
  borderColor, borderWidth, square = false, onPress,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [url]);
  const radius = square ? Math.floor(size * 0.22) : size / 2;

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    backgroundColor: color,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
    ...(borderColor ? { borderWidth: borderWidth ?? 2, borderColor } : {}),
  };

  const inner = url && !imgError ? (
    <Image
      source={{ uri: url }}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
      onError={() => setImgError(true)}
    />
  ) : (
    <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize, color: '#fff' }}>
      {initials}
    </Text>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={containerStyle} onPress={onPress} activeOpacity={0.8}>
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{inner}</View>;
}
