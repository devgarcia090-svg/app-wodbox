import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useBoxConfig } from '../context/BoxConfigContext';
import { BoxLogo } from '../components/common/BoxLogo';

export function LoginScreen() {
  const { needsPasswordSetup } = useAuth();
  return needsPasswordSetup ? <SetPasswordScreen /> : <SignInScreen />;
}

function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const boxConfig = useBoxConfig();

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) setError('Email o contraseña incorrectos');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return <ForgotPasswordScreen onBack={() => setShowForgot(false)} />;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <BoxLogo size="large" />
          {boxConfig.tagline ? (
            <Text style={styles.tagline}>{boxConfig.tagline}</Text>
          ) : null}
        </View>

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
            style={[styles.btn, { backgroundColor: boxConfig.primary_color }, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Entrar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowForgot(true)} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const boxConfig = useBoxConfig();

  const handleReset = async () => {
    if (!email.trim()) { setError('Introduce tu email'); return; }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: 'wodbox://auth/callback',
    });
    setLoading(false);
    if (error) {
      setError('Error al enviar el email. Inténtalo de nuevo.');
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }]}>
        <Text style={{ fontSize: 48, marginBottom: 20 }}>📬</Text>
        <Text style={[styles.btnText, { fontSize: 20, marginBottom: 8, color: Colors.white }]}>Email enviado</Text>
        <Text style={{ color: Colors.muted, fontFamily: Fonts.body, fontSize: 14, textAlign: 'center', marginBottom: 32 }}>
          Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.
        </Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.forgotText, { color: boxConfig.primary_color }]}>Volver al login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <BoxLogo size="large" />
        </View>

        <View style={styles.form}>
          <Text style={[styles.welcomeTitle, { marginBottom: 4 }]}>Restablecer contraseña</Text>
          <Text style={styles.welcomeSub}>Te enviaremos un enlace a tu email.</Text>

          <Text style={[styles.label, { marginTop: 16 }]}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor={Colors.muted}
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            autoFocus
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: boxConfig.primary_color }, loading && styles.btnDisabled]}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Enviar enlace</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={onBack} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Volver al login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function SetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const boxConfig = useBoxConfig();

  const { session } = useAuth();
  const name = session?.user?.user_metadata?.name ?? 'Atleta';

  const handleSetPassword = async () => {
    setError('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { invited: false },
    });
    setLoading(false);

    if (error) {
      setError('Error al guardar la contraseña. Inténtalo de nuevo.');
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 48, marginBottom: 20 }}>💪</Text>
        <Text style={[styles.welcomeTitle, { fontSize: 28, marginBottom: 8 }]}>¡Bienvenido/a!</Text>
        <Text style={{ color: Colors.muted, fontFamily: Fonts.body, fontSize: 15, textAlign: 'center', paddingHorizontal: 32 }}>
          Tu cuenta está lista. Ya puedes empezar a reservar clases.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <BoxLogo size="large" />
          <Text style={styles.tagline}>Hola, <Text style={{ color: boxConfig.primary_color }}>{name}</Text> 👋</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.welcomeTitle}>Crea tu contraseña</Text>
          <Text style={styles.welcomeSub}>Es la última vez que necesitas hacer esto.</Text>

          <Text style={[styles.label, { marginTop: 16 }]}>Nueva contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={Colors.muted}
            value={password}
            onChangeText={t => { setPassword(t); setError(''); }}
            secureTextEntry
            autoFocus
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Confirmar contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Repite la contraseña"
            placeholderTextColor={Colors.muted}
            value={confirm}
            onChangeText={t => { setConfirm(t); setError(''); }}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: boxConfig.primary_color }, loading && styles.btnDisabled]}
            onPress={handleSetPassword}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Guardar y entrar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 32 },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  tagline: { color: Colors.muted, fontFamily: Fonts.body, fontSize: 14, marginTop: 8 },
  form: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 16, padding: 20, marginBottom: 24,
  },
  welcomeTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.white, marginBottom: 4 },
  welcomeSub: { color: Colors.muted, fontFamily: Fonts.body, fontSize: 13, marginBottom: 4 },
  label: {
    fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.white, fontFamily: Fonts.body, fontSize: 15,
  },
  error: { color: Colors.red, fontSize: 13, fontFamily: Fonts.body, marginTop: 10, textAlign: 'center' },
  btn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: Fonts.bodySemiBold, fontSize: 16, color: '#fff' },
  forgotBtn: { alignItems: 'center', marginTop: 14 },
  forgotText: { color: Colors.muted, fontFamily: Fonts.body, fontSize: 13 },
});
