import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
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
import { LoginScreen, type UserRole } from './src/screens/LoginScreen';
import { Colors } from './src/theme/colors';
import { Fonts } from './src/theme/fonts';

interface Session {
  role: UserRole;
  name: string;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

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

  if (!session) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={Colors.black} />
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.black }} edges={['top']}>
          <LoginScreen onLogin={setSession} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={Colors.surface} />
      <NavigationContainer>
        <SafeAreaView style={styles.root} edges={['top']}>
          {/* Top Nav */}
          <View style={styles.nav}>
            <Text style={styles.logo}>WOD<Text style={styles.logoAccent}>BOX</Text></Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={() => setSession(null)}>
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {session.role === 'athlete' ? <AthleteNavigator /> : <AdminNavigator />}
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
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  logoutText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.muted,
  },
  content: { flex: 1, backgroundColor: Colors.black },
});
