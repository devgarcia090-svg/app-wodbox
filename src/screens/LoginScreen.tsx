import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Dimensions, Animated,
} from 'react-native';
import { Colors, withAlpha } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useBoxConfig } from '../context/BoxConfigContext';

const { width: W, height: H } = Dimensions.get('window');

// ─── Ambient glow blob behind the logo ──────────────────────────────────────
function AmbientBlob({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 3200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.7, duration: 3200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: W * 1.1, height: W * 1.1,
        borderRadius: W * 0.55,
        top: -W * 0.42,
        alignSelf: 'center',
        backgroundColor: withAlpha(color, 0.07),
        opacity: pulse,
      }}
    />
  );
}

// ─── Hero logo — two-line brand wordmark ────────────────────────────────────
function HeroLogo() {
  const { name, primary_color, tagline, logo_prefix, logo_highlight } = useBoxConfig();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  let top: string, bottom: string;
  if (logo_highlight && name.includes(logo_highlight)) {
    const before = name.replace(logo_highlight, '').trim();
    top = (before || name.slice(0, Math.ceil(name.length / 2))).toUpperCase();
    bottom = logo_highlight.toUpperCase();
  } else {
    const half = Math.ceil(name.length / 2);
    top = name.slice(0, half).toUpperCase();
    bottom = name.slice(half).toUpperCase();
  }

  const longest = Math.max(top.length, bottom.length);
  // Target ~78% screen width fill
  const fs = Math.min(Math.floor((W * 0.78) / (longest * 0.46)), 200);

  return (
    <Animated.View style={[hero.wrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {logo_prefix ? (
        <Text style={hero.prefix}>{logo_prefix.toUpperCase()}</Text>
      ) : null}
      <Text style={[hero.top, { fontSize: fs, lineHeight: fs * 0.9 }]}>{top}</Text>
      <View style={[hero.accentLine, { backgroundColor: primary_color, width: fs * longest * 0.46 * 0.4 }]} />
      <Text style={[hero.bottom, { fontSize: fs, lineHeight: fs * 0.9, color: primary_color,
        textShadowColor: withAlpha(primary_color, 0.55),
        textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 },
      }]}>{bottom}</Text>
      <Text style={hero.tagline}>{tagline ?? 'Train · Compete · Improve'}</Text>
    </Animated.View>
  );
}

const hero = StyleSheet.create({
  wrap: { alignItems: 'center' },
  prefix: {
    fontFamily: Fonts.bodySemiBold, fontSize: 10,
    color: 'rgba(255,255,255,0.3)', letterSpacing: 5, marginBottom: 8,
  },
  top: {
    fontFamily: Fonts.headingXBold,
    color: '#EDEDEF',
    letterSpacing: 5,
  },
  accentLine: { height: 2, borderRadius: 1, marginVertical: 4 },
  bottom: {
    fontFamily: Fonts.headingXBold,
    letterSpacing: 5,
  },
  tagline: {
    fontFamily: Fonts.body, fontSize: 11,
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 14,
  },
});

// ─── Animated press button ───────────────────────────────────────────────────
function GlowButton({
  label, onPress, loading, color,
}: { label: string; onPress: () => void; loading: boolean; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <View style={{ marginTop: 28 }}>
      {/* Glow layer */}
      <View style={[btnStyles.glow, { backgroundColor: withAlpha(color, 0.3) }]} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={[btnStyles.btn, { backgroundColor: color }, loading && btnStyles.off]}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={loading}
          activeOpacity={1}
          accessibilityLabel={label}
          accessibilityRole="button"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={btnStyles.text}>{label}</Text>}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const btnStyles = StyleSheet.create({
  glow: { position: 'absolute', left: 20, right: 20, top: 16, bottom: -8, borderRadius: 18 },
  btn: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  off: { opacity: 0.55 },
  text: {
    fontFamily: Fonts.headingXBold, fontSize: 16,
    color: '#fff', letterSpacing: 3, textTransform: 'uppercase',
  },
});

// ─── Password field with show/hide ───────────────────────────────────────────
function PasswordInput({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <TextInput
        style={form.input}
        placeholder="••••••••"
        placeholderTextColor="rgba(255,255,255,0.2)"
        value={value}
        onChangeText={onChange}
        secureTextEntry={!show}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <TouchableOpacity
        onPress={() => setShow(s => !s)}
        style={form.eyeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <Text style={form.eyeText}>{show ? '●' : '○'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Back button ─────────────────────────────────────────────────────────────
function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={back.btn}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      accessibilityLabel="Volver"
    >
      <Text style={back.text}>←</Text>
    </TouchableOpacity>
  );
}
const back = StyleSheet.create({
  btn: { position: 'absolute', top: 54, left: 24, zIndex: 10 },
  text: { color: 'rgba(255,255,255,0.45)', fontSize: 22 },
});

// ─── Root export ──────────────────────────────────────────────────────────────
export function LoginScreen() {
  const { needsPasswordSetup } = useAuth();
  return needsPasswordSetup ? <SetPasswordScreen /> : <SignInScreen />;
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { primary_color } = useBoxConfig();
  const passRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
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
      <AmbientBlob color={primary_color} />

      {/* Hero */}
      <View style={[root.hero, { height: H * 0.43 }]}>
        <HeroLogo />
      </View>

      {/* Form card */}
      <View style={root.cardWrap}>
        <View style={root.card}>
          <Text style={form.label}>Email</Text>
          <TextInput
            style={form.input}
            placeholder="tu@email.com"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passRef.current?.focus()}
            accessibilityLabel="Email"
          />

          <Text style={[form.label, { marginTop: 20 }]}>Contraseña</Text>
          <PasswordInput value={password} onChange={t => { setPassword(t); setError(''); }} />

          {error ? <Text style={form.error} accessibilityRole="alert">{error}</Text> : null}

          <GlowButton label="Entrar" onPress={handleLogin} loading={loading} color={primary_color} />

          <TouchableOpacity
            onPress={() => setShowForgot(true)}
            style={form.forgot}
            accessibilityLabel="Olvidaste tu contraseña"
          >
            <Text style={form.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
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
      <View style={[root.bg, sub.center]}>
        <AmbientBlob color={primary_color} />
        <Text style={sub.emoji}>📬</Text>
        <Text style={sub.title}>Email enviado</Text>
        <Text style={sub.body}>Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.</Text>
        <TouchableOpacity onPress={onBack} style={{ marginTop: 36 }}>
          <Text style={[form.forgotText, { color: primary_color, fontSize: 15 }]}>← Volver al login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={root.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AmbientBlob color={primary_color} />
      <BackBtn onPress={onBack} />
      <View style={[root.hero, { height: H * 0.4 }]}>
        <Text style={sub.title}>Recuperar{'\n'}contraseña</Text>
        <Text style={[sub.body, { marginTop: 8 }]}>Te enviaremos un enlace a tu email.</Text>
      </View>
      <View style={root.cardWrap}>
        <View style={root.card}>
          <Text style={form.label}>Email</Text>
          <TextInput
            style={form.input}
            placeholder="tu@email.com"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            autoFocus
            accessibilityLabel="Email"
          />
          {error ? <Text style={form.error}>{error}</Text> : null}
          <GlowButton label="Enviar enlace" onPress={handleReset} loading={loading} color={primary_color} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Set Password ─────────────────────────────────────────────────────────────
function SetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { primary_color } = useBoxConfig();
  const { session } = useAuth();
  const name = session?.user?.user_metadata?.name ?? 'Atleta';
  const confirmRef = useRef<TextInput>(null);

  const handleSetPassword = async () => {
    setError('');
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password, data: { invited: false } });
    setLoading(false);
    if (err) setError('Error al guardar. Inténtalo de nuevo.');
    else setDone(true);
  };

  if (done) {
    return (
      <View style={[root.bg, sub.center]}>
        <AmbientBlob color={primary_color} />
        <Text style={sub.emoji}>💪</Text>
        <Text style={sub.title}>¡Bienvenido/a!</Text>
        <Text style={sub.body}>Tu cuenta está lista. Ya puedes empezar a reservar clases.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={root.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AmbientBlob color={primary_color} />
      <View style={[root.hero, { height: H * 0.36 }]}>
        <Text style={sub.title}>
          Hola, <Text style={{ color: primary_color }}>{name}</Text> 👋
        </Text>
        <Text style={[sub.body, { marginTop: 8 }]}>Crea tu contraseña para continuar.</Text>
      </View>
      <View style={root.cardWrap}>
        <View style={root.card}>
          <Text style={form.label}>Nueva contraseña</Text>
          <TextInput
            style={form.input}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={password}
            onChangeText={t => { setPassword(t); setError(''); }}
            secureTextEntry
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            accessibilityLabel="Nueva contraseña"
          />
          <Text style={[form.label, { marginTop: 20 }]}>Confirmar contraseña</Text>
          <TextInput
            ref={confirmRef}
            style={form.input}
            placeholder="Repite la contraseña"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={confirm}
            onChangeText={t => { setConfirm(t); setError(''); }}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSetPassword}
            accessibilityLabel="Confirmar contraseña"
          />
          {error ? <Text style={form.error}>{error}</Text> : null}
          <GlowButton label="Guardar y entrar" onPress={handleSetPassword} loading={loading} color={primary_color} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const root = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#040608' },
  hero: { alignItems: 'center', justifyContent: 'center' },
  cardWrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 32 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 24,
  },
});

const form = StyleSheet.create({
  label: {
    fontFamily: Fonts.bodySemiBold, fontSize: 10,
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },
  input: {
    fontFamily: Fonts.body, fontSize: 16,
    color: '#EDEDEF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12, paddingHorizontal: 0, paddingRight: 36,
  },
  eyeBtn: { position: 'absolute', right: 0, bottom: 10 },
  eyeText: { fontSize: 16, color: 'rgba(255,255,255,0.35)' },
  error: {
    fontFamily: Fonts.body, fontSize: 13,
    color: Colors.red, marginTop: 12, textAlign: 'center',
  },
  forgot: { alignItems: 'center', marginTop: 20, paddingBottom: 2 },
  forgotText: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.28)' },
});

const sub = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emoji: { fontSize: 52, marginBottom: 20 },
  title: {
    fontFamily: Fonts.headingXBold, fontSize: 30,
    color: '#EDEDEF', letterSpacing: 1,
    textAlign: 'center', lineHeight: 34,
  },
  body: {
    fontFamily: Fonts.body, fontSize: 14,
    color: 'rgba(255,255,255,0.32)',
    textAlign: 'center', lineHeight: 20,
  },
});
