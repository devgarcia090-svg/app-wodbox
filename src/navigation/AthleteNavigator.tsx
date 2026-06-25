import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { HomeScreen } from '../screens/athlete/HomeScreen';
import { ChatScreen } from '../screens/athlete/ChatScreen';
import { ProfileScreen } from '../screens/athlete/ProfileScreen';

type AthleteTab = 'inicio' | 'chat' | 'perfil';

const TABS: { key: AthleteTab; label: string; icon: string }[] = [
  { key: 'inicio', label: 'Inicio', icon: '🏠' },
  { key: 'chat',   label: 'Chat',   icon: '💬' },
  { key: 'perfil', label: 'Perfil', icon: '👤' },
];

export function AthleteNavigator() {
  const [active, setActive] = useState<AthleteTab>('inicio');

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {active === 'inicio' && <HomeScreen />}
        {active === 'chat'   && <ChatScreen />}
        {active === 'perfil' && <ProfileScreen />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const focused = active === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabBtn}
              onPress={() => setActive(tab.key)}
              activeOpacity={0.7}
            >
              {focused && <View style={styles.activeLine} />}
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
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
    height: 62,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 8,
    gap: 2,
  },
  activeLine: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.orange,
  },
  tabIcon: { fontSize: 18 },
  tabLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    color: Colors.muted,
  },
  tabLabelActive: { color: Colors.orange },
});
