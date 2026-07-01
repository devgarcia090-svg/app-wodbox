import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useBoxConfig } from '../context/BoxConfigContext';

import { HomeScreen } from '../screens/athlete/HomeScreen';
import { ChatScreen } from '../screens/athlete/ChatScreen';
import { ProfileScreen } from '../screens/athlete/ProfileScreen';

type AthleteTab = 'inicio' | 'chat' | 'perfil';

const TABS: { key: AthleteTab; label: string; icon: string }[] = [
  { key: 'inicio',  label: 'Inicio',  icon: '🏠' },
  { key: 'chat',    label: 'Chat',    icon: '💬' },
  { key: 'perfil',  label: 'Perfil',  icon: '👤' },
];

export function AthleteNavigator() {
  const [active, setActive] = useState<AthleteTab>('inicio');
  const insets = useSafeAreaInsets();
  const { primary_color } = useBoxConfig();

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {active === 'inicio'  && <HomeScreen />}
        {active === 'chat'    && <ChatScreen />}
        {active === 'perfil'  && <ProfileScreen />}
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {TABS.map(tab => {
          const focused = active === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabBtn}
              onPress={() => setActive(tab.key)}
              activeOpacity={0.7}
            >
              {focused && <View style={[styles.activeLine, { backgroundColor: primary_color }]} />}
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, focused && { color: primary_color }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.black },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    gap: 2,
  },
  activeLine: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 2,
    borderRadius: 1,
  },
  tabIcon: { fontSize: 18 },
  tabLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    color: Colors.muted,
  },
});
