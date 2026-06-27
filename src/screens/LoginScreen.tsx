import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Colors, withAlpha } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useBoxConfig } from '../context/BoxConfigContext';

const { width: W, height: H } = Dimensions.get('window');

// ── Background rings centered on the logo area ───────────────────────────────
function BgRings({ color }: { color: string }) {
  const cy = H * 0.33;
  const rings = [
    { s: 1.1, alpha: 0.04, border: 1 },
    { s: 0.78, alpha: 0.08, border: 1 },
    { s: 0.52, alpha: 0.13, border: 1.5 },
    { s: 0.28, alpha: 0.09, border: 0, fill: true },
  ];
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {rings.map((r, i) => (
        <View key={i} style={{
          position: 'absolute',
          width: W * r.s, height: W * r.s,
          borderRadius: W * r.s / 2,
          left: W * (1 - r.s) / 2,
          top: cy - W * r.s / 2,
          borderWidth: r.fill ? 0 : r.border,
          borderColor: r.fill ? undefined : withAlpha(color, r.alpha),
          backgroundColor: r.fill ? withAlpha(color, r.alpha) : 'transparent',
        }} />
      ))}
    </View>
  );
}

// ── Two-line hero logo ───────────────────────────────────────────────────────
function HeroLogo() {
  const { name, primary_color, tagline, logo_prefix, logo_highlight } = useBoxConfig();

  let top: string;
  let bottom: string;
  if (logo_highlight && name.includes(logo_highlight)) {
    const before = name.replace(logo_highlight, '').trim();
    top = (before || name.slice(0, Math.ceil(name.length / 2))).toUpperCase();
    bottom = logo_highlight.toUpperCase();
  } else {
    const half = Math.ceil(name.length / 2);
    top = name.slice(0, half).toUpperCase();
    bottom = name.slice(half).toUpperCase();
  }

  // Responsive font size: fill ~72% of screen width
  const longestLen = Math.max(top.length, bottom.length);
  const fs = Math.min(Math.floor((W * 0.72) / (longestLen * 0.46)), 130);

  return (
    <View style={hero.wrap}>
      {logo_prefix ? (
        <Text style={hero.prefix}>{logo_prefix.toUpperCase()}</Text>
      ) : null}
      <Text style={[hero.word, { fontSize: fs, lineHeight: fs * 0.88 }]}>
        {top}
      </Text>
      <Text style={[hero.word, { fontSize: fs, lineHeight: fs * 0.88, color: primary_color }]}>
        {bottom}
      </Text>
      <View style={[hero.bar, { backgroundColor: primary_color }]} />
      <Text style={hero.tagline}>
        {tagline ?? 'Train · Compete · Improve'}
      </Text>
    </View>
  );
}

const hero = StyleSheet.create({
  wrap: { alignItems: 'center' },
  prefix: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 5,
    marginBottom: 6,
  },
  word: {
    fontFamily: Fonts.headingXBold,
    color: '#f5f5f5',
    letterSpacing: 6,
  },
  bar: { width: 36, height: 2, borderRadius: 1, marginTop: 18, marginBottom: 10 },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
});

// ── Shared underline input ───────────────────────────────────────────────────
function LineInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      style={[form.input, props.style]}
      placeholderTextColor="rgba(255,255,255,0.22)"
    />
  );
}

// ── Back button ──────────────────────────────────────────────────────────────
function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={back.btn} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
      <Text style={back.arrow}>←</Text>
    </TouchableOpacity>
  );
}
const back = StyleSheet.create({
  btn: { position: 'absolute', top: 52, left: 24, zIndex: 10 },
  arrow: { color: 'rgba(255,255,255,0.5)', fontSize: 22 },
});

// ── Root ─────────────────────────────────────────────────────────────────────
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
  const { primary_color } = useBoxConfig();

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
    <KeyboardAvoidingView style={root.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BgRings color={primary_color} />

      {/* Hero */}
      <View style={root.hero}>
        <HeroLogo />
      </View>

      {/* Form pinned to bottom */}
      <View style={root.form}>
        <Text style={form.label}>Email</Text>
        <LineInput
          placeholder="tu@email.com"
          value={email}
          onChangeText={t => { setEmail(t); setError(''); }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />

        <Text style={[form.label, { marginTop: 24 }]}>Contraseña</Text>
        <LineInput
          placeholder="••••••••"
          value={password}
          onChangeText={t => { setPassword(t); setError(''); }}
          secureTextEntry
        />

        {error ? <Text style={form.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[form.btn, { backgroundColor: primary_color }, loading && form.btnOff]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.82}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={form.btnText}>Entrar</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowForgot(true)} style={form.forgot}>
          <Text style={form.forgotText}>¿Olvidaste tu contraseña?</Text>
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
      <View style={[root.bg, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }]}>
        <BgRings color={primary_color} />
        <Text style={{ fontSize: 52, marginBottom: 20 }}>📬</Text>
        <Text style={sub.title}>Email enviado</Text>
        <Text style={sub.body}>
          Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.
        </Text>
        <TouchableOpacity onPress={onBack} style={{ marginTop: 36 }}>
          <Text style={[form.forgotText, { color: primary_color }]}>← Volver al login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={root.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BgRings color={primary_color} />
      <BackBtn onPress={onBack} />
      <View style={root.hero}>
        <Text style={sub.title}>Recuperar{'\n'}contraseña</Text>
        <Text style={sub.body}>Te enviaremos un enlace a tu email.</Text>
      </View>
      <View style={root.form}>
        <Text style={form.label}>Email</Text>
        <LineInput
          placeholder="tu@email.com"
          value={email}
          onChangeText={t => { setEmail(t); setError(''); }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          autoFocus
        />
        {error ? <Text style={form.error}>{error}</Text> : null}
        <TouchableOpacity
          style={[form.btn, { backgroundColor: primary_color, marginTop: 32 }, loading && form.btnOff]}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.82}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={form.btnText}>Enviar enlace</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Set Password ─────────────────────────────────────────────────────────────
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
      <View style={[root.bg, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }]}>
        <BgRings color={primary_color} />
        <Text style={{ fontSize: 52, marginBottom: 20 }}>💪</Text>
        <Text style={sub.title}>¡Bienvenido/a!</Text>
        <Text style={sub.body}>Tu cuenta está lista. Ya puedes empezar a reservar clases.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={root.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BgRings color={primary_color} />
      <View style={root.hero}>
        <Text style={sub.title}>
          Hola, <Text style={{ color: primary_color }}>{name}</Text> 👋
        </Text>
        <Text style={sub.body}>Crea tu contraseña para continuar.</Text>
      </View>
      <View style={root.form}>
        <Text style={form.label}>Nueva contraseña</Text>
        <LineInput
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChangeText={t => { setPassword(t); setError(''); }}
          secureTextEntry
          autoFocus
        />
        <Text style={[form.label, { marginTop: 24 }]}>Confirmar contraseña</Text>
        <LineInput
          placeholder="Repite la contraseña"
          value={confirm}
          onChangeText={t => { setConfirm(t); setError(''); }}
          secureTextEntry
        />
        {error ? <Text style={form.error}>{error}</Text> : null}
        <TouchableOpacity
          style={[form.btn, { backgroundColor: primary_color, marginTop: 32 }, loading && form.btnOff]}
          onPress={handleSetPassword}
          disabled={loading}
          activeOpacity={0.82}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={form.btnText}>Guardar y entrar</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const root = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#070b12' },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
  },
});

const form = StyleSheet.create({
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  error: {
    color: Colors.red,
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: 14,
    textAlign: 'center',
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 28,
  },
  btnOff: { opacity: 0.55 },
  btnText: {
    fontFamily: Fonts.headingXBold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  forgot: { alignItems: 'center', marginTop: 22, paddingBottom: 4 },
  forgotText: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.3)' },
});

const sub = StyleSheet.create({
  title: {
    fontFamily: Fonts.headingXBold,
    fontSize: 32,
    color: '#f5f5f5',
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 10,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 4,
  },
});
