import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Dimensions, Image,
} from 'react-native';
import { Colors, withAlpha } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useBoxConfig } from '../context/BoxConfigContext';
import { BoxLogo } from '../components/common/BoxLogo';

const { width: W, height: H } = Dimensions.get('window');

// ── Decorative rings behind the hero ────────────────────────────────────────
function BgRings({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={[ring.c, {
        width: W * 1.5, height: W * 1.5,
        top: -W * 0.85, left: -W * 0.25,
        borderRadius: W * 0.75, borderWidth: 1,
        borderColor: withAlpha(color, 0.05),
      }]} />
      <View style={[ring.c, {
        width: W * 1.05, height: W * 1.05,
        top: -W * 0.58, left: W * -0.025,
        borderRadius: W * 0.525, borderWidth: 1,
        borderColor: withAlpha(color, 0.09),
      }]} />
      <View style={[ring.c, {
        width: W * 0.68, height: W * 0.68,
        top: -W * 0.28, left: W * 0.16,
        borderRadius: W * 0.34, borderWidth: 1.5,
        borderColor: withAlpha(color, 0.14),
      }]} />
      <View style={[ring.c, {
        width: W * 0.36, height: W * 0.36,
        top: -W * 0.06, left: W * 0.32,
        borderRadius: W * 0.18,
        backgroundColor: withAlpha(color, 0.06),
      }]} />
      {/* Bottom corner accent */}
      <View style={[ring.c, {
        width: W * 0.8, height: W * 0.8,
        bottom: -W * 0.5, right: -W * 0.35,
        borderRadius: W * 0.4, borderWidth: 1,
        borderColor: withAlpha(color, 0.05),
      }]} />
    </View>
  );
}
const ring = StyleSheet.create({ c: { position: 'absolute' } });

// ── Shared back button ───────────────────────────────────────────────────────
function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={back.btn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
      <Text style={back.arrow}>←</Text>
    </TouchableOpacity>
  );
}
const back = StyleSheet.create({
  btn: { position: 'absolute', top: 52, left: 24, zIndex: 10 },
  arrow: { color: Colors.white, fontSize: 24 },
});

// ── Main export ──────────────────────────────────────────────────────────────
export function LoginScreen() {
  const { needsPasswordSetup } = useAuth();
  return needsPasswordSetup ? <SetPasswordScreen /> : <SignInScreen />;
}

// ── Sign In ──────────────────────────────────────────────────────────────────
function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { primary_color, tagline } = useBoxConfig();

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (err) setError('Email o contraseña incorrectos');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) return <ForgotPasswordScreen onBack={() => setShowForgot(false)} />;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <BgRings color={primary_color} />

      {/* Hero */}
      <View style={styles.hero}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logoImg}
          resizeMode="contain"
        />
        <BoxLogo size="large" />
        <Text style={styles.tagline}>
          {tagline ?? 'Entrena · Compite · Mejora'}
        </Text>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: withAlpha(primary_color, 0.25) }]} />

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

        <Text style={[styles.label, { marginTop: 18 }]}>Contraseña</Text>
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
          style={[styles.btn, { backgroundColor: primary_color }, loading && styles.btnOff]}
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
    </KeyboardAvoidingView>
  );
}

// ── Forgot Password ──────────────────────────────────────────────────────────
function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { primary_color } = useBoxConfig();

  const handleReset = async () => {
    if (!email.trim()) { setError('Introduce tu email'); return; }
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: 'wodbox://auth/callback',
    });
    setLoading(false);
    if (err) setError('Error al enviar el email. Inténtalo de nuevo.');
    else setSent(true);
  };

  if (sent) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }]}>
        <BgRings color={primary_color} />
        <Text style={{ fontSize: 52, marginBottom: 20 }}>📬</Text>
        <Text style={styles.sentTitle}>Email enviado</Text>
        <Text style={styles.sentSub}>
          Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.
        </Text>
        <TouchableOpacity onPress={onBack} style={{ marginTop: 32 }}>
          <Text style={[styles.forgotText, { color: primary_color, fontSize: 15 }]}>← Volver al login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BgRings color={primary_color} />
      <BackBtn onPress={onBack} />

      <View style={styles.subHero}>
        <Text style={styles.subTitle}>Recuperar contraseña</Text>
        <Text style={styles.subSub}>Te enviaremos un enlace a tu email.</Text>
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
          autoFocus
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: primary_color }, loading && styles.btnOff]}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Enviar enlace</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Set Password (invited users) ─────────────────────────────────────────────
function SetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { primary_color } = useBoxConfig();
  const { session } = useAuth();
  const name = session?.user?.user_metadata?.name ?? 'Atleta';

  const handleSetPassword = async () => {
    setError('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password, data: { invited: false } });
    setLoading(false);
    if (err) setError('Error al guardar la contraseña. Inténtalo de nuevo.');
    else setDone(true);
  };

  if (done) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }]}>
        <BgRings color={primary_color} />
        <Text style={{ fontSize: 52, marginBottom: 20 }}>💪</Text>
        <Text style={styles.sentTitle}>¡Bienvenido/a!</Text>
        <Text style={styles.sentSub}>Tu cuenta está lista. Ya puedes empezar a reservar clases.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BgRings color={primary_color} />

      <View style={styles.subHero}>
        <Image source={require('../../assets/icon.png')} style={[styles.logoImg, { width: 72, height: 72 }]} resizeMode="contain" />
        <Text style={styles.subTitle}>
          Hola, <Text style={{ color: primary_color }}>{name}</Text> 👋
        </Text>
        <Text style={styles.subSub}>Crea tu contraseña para continuar.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nueva contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={Colors.muted}
          value={password}
          onChangeText={t => { setPassword(t); setError(''); }}
          secureTextEntry
          autoFocus
        />

        <Text style={[styles.label, { marginTop: 18 }]}>Confirmar contraseña</Text>
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
          style={[styles.btn, { backgroundColor: primary_color }, loading && styles.btnOff]}
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
    </KeyboardAvoidingView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080c14',
  },
  // SignIn hero
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
  },
  logoImg: {
    width: 90,
    height: 90,
    marginBottom: 14,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  divider: {
    height: 1,
    marginHorizontal: 28,
    marginBottom: 28,
  },
  // Sub-screens hero
  subHero: {
    alignItems: 'center',
    paddingTop: H * 0.18,
    paddingBottom: 32,
    paddingHorizontal: 28,
  },
  subTitle: {
    fontFamily: Fonts.headingXBold,
    fontSize: 28,
    color: Colors.white,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 6,
  },
  subSub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
  },
  // Form
  form: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: Colors.white,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  error: {
    color: Colors.red,
    fontSize: 13,
    fontFamily: Fonts.body,
    marginTop: 12,
    textAlign: 'center',
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 24,
  },
  btnOff: { opacity: 0.6 },
  btnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  forgotBtn: { alignItems: 'center', marginTop: 20 },
  forgotText: { color: Colors.muted, fontFamily: Fonts.body, fontSize: 13 },
  // Sent confirmation
  sentTitle: {
    fontFamily: Fonts.headingXBold,
    fontSize: 26,
    color: Colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  sentSub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
});
