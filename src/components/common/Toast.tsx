import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

type ToastType = 'success' | 'error' | 'info' | 'default';

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
}

export function Toast({ message, type, visible }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const borderColor =
    type === 'success' ? Colors.green :
    type === 'error' ? Colors.red :
    type === 'info' ? Colors.blue :
    Colors.border;

  const textColor =
    type === 'success' ? Colors.green :
    type === 'error' ? Colors.red :
    type === 'info' ? Colors.blue :
    Colors.white;

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }], borderColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 999,
  },
  text: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
  },
});
