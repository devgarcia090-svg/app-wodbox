import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { HomeScreen } from '../screens/athlete/HomeScreen';
import { CalendarScreen } from '../screens/athlete/CalendarScreen';
import { ChatScreen } from '../screens/athlete/ChatScreen';
import { ProfileScreen } from '../screens/athlete/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? Colors.orange : Colors.muted;

  const icons: Record<string, React.ReactNode> = {
    Home: (
      <View style={[styles.iconWrap, { borderColor: 'transparent' }]}>
        <Text style={[styles.iconSvg, { color }]}>⌂</Text>
      </View>
    ),
    Calendar: <Text style={[styles.iconSvg, { color }]}>📅</Text>,
    Chat: (
      <View>
        <Text style={[styles.iconSvg, { color }]}>💬</Text>
      </View>
    ),
    Profile: <Text style={[styles.iconSvg, { color }]}>👤</Text>,
  };

  return icons[name] ?? null;
}

export function AthleteNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.orange,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} /> }}
      />
      <Tab.Screen
        name="Horario"
        component={CalendarScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Calendar" focused={focused} /> }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Chat" focused={focused} /> }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 6,
    height: 62,
  },
  tabLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  iconSvg: { fontSize: 20 },
});
