import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { AdminDashboard } from '../screens/admin/AdminDashboard';

const Tab = createBottomTabNavigator();

// Admin uses a single screen with internal tab navigation for the panel content
export function AdminNavigator() {
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
        name="Resumen"
        component={AdminDashboard}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⊞</Text> }}
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
});
