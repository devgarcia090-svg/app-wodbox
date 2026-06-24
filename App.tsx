import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  BarlowCondensed_400Regular,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { AthleteNavigator } from './src/navigation/AthleteNavigator';
import { AdminNavigator } from './src/navigation/AdminNavigator';
import { Colors } from './src/theme/colors';
import { Fonts } from './src/theme/fonts';

type ViewMode = 'athlete' | 'admin';

export default function App() {
  const [view, setView] = useState<ViewMode>('athlete');

  const [fontsLoaded] = useFonts({
    BarlowCondensed_400Regular,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={Colors.surface} />
      <NavigationContainer>
        <SafeAreaView style={styles.root} edges={['top']}>
          {/* Top Nav */}
          <View style={styles.nav}>
            <Text style={styles.logo}>WOD<Text style={styles.logoAccent}>BOX</Text></Text>
            <View style={styles.navTabs}>
              <TouchableOpacity
                style={[styles.navTab, view === 'athlete' && styles.navTabActive]}
                onPress={() => setView('athlete')}
              >
                <Text style={[styles.navTabText, view === 'athlete' && styles.navTabTextActive]}>Atleta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navTab, view === 'admin' && styles.navTabActive]}
                onPress={() => setView('admin')}
              >
                <Text style={[styles.navTabText, view === 'admin' && styles.navTabTextActive]}>Gestión</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {view === 'athlete' ? <AthleteNavigator /> : <AdminNavigator />}
          </View>
        </SafeAreaView>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  nav: {
    height: 56,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logo: {
    fontFamily: Fonts.headingXBold,
    fontSize: 22,
    letterSpacing: 1,
    color: Colors.white,
  },
  logoAccent: { color: Colors.orange },
  navTabs: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: Colors.surface2,
    borderRadius: 8,
    padding: 4,
  },
  navTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  navTabActive: { backgroundColor: Colors.orange },
  navTabText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.muted,
  },
  navTabTextActive: { color: '#fff' },
  content: { flex: 1, backgroundColor: Colors.black },
});
