import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { supabase } from '../lib/supabase';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setError('Email o contraseña incorrectos');
      }
      // On success AuthContext auto-updates — no callback needed
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>WOD<Text style={styles.logoAccent}>BOX</Text></Text>
          <Text style={styles.tagline}>Gestión inteligente para tu box</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor={Colors.muted}
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.muted}
            value={password}
            onChangeText={t => { setPassword(t); setError(''); }}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Demo hint */}
        <View style={styles.hint}>
          <Text style={styles.hintTitle}>Accesos demo</Text>
          <Text style={styles.hintRow}>Atleta · carlos@wodbox.com / carlos123</Text>
          <Text style={styles.hintRow}>Admin · admin@wodbox.com / admin123</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logo: {
    fontFamily: Fonts.headingXBold,
    fontSize: 48,
    letterSpacing: 2,
    color: Colors.white,
  },
  logoAccent: { color: Colors.orange },
  tagline: {
    color: Colors.muted,
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.white,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  error: {
    color: Colors.red,
    fontSize: 13,
    fontFamily: Fonts.body,
    marginTop: 10,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: Colors.orange,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: '#fff',
  },
  hint: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
  },
  hintTitle: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  hintRow: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.muted,
    marginTop: 3,
  },
});
