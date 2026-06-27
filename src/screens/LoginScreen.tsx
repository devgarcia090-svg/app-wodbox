import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Dimensions, Animated,
} from 'react-native';
import { Fonts } from '../theme/fonts';
import { withAlpha } from '../theme/colors';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useBoxConfig } from '../context/BoxConfigContext';

const { width: W } = Dimensions.get('window');

const T = {
  bg:     '#0f1623',
  card:   '#1a2235',
  card2:  '#202d42',
  border: '#2d3f5c',
  text:   '#F8FAFC',
  muted:  '#94A3B8',
  red:    '#EF4444',
};

// ── Animated press wrapper ─────────────────────────────────────────────────────
function PressScale({ children, onPress, disabled, style, accessibilityLabel }: {
  children: React.ReactNode; onPress: () => void;
  disabled?: boolean; style?: object; accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 50, bounciness: 4 });
  return (
    <Pressable
      onPressIn={() => spring(0.97).start()}
      onPressOut={() => spring(1).start()}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ── Field ──────────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={fieldS.wrap}>
      <Text style={fieldS.label}>{label}</Text>
      {children}
    </View>
  );
}
const fieldS = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontFamily: Fonts.bodySemiBold, fontSize: 11, color: T.muted,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
  },
});

// ── Input ──────────────────────────────────────────────────────────────────────
const inputStyle = StyleSheet.create({
  base: {
    backgroundColor: T.card2,
    borderWidth: 1, borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    color: T.text, fontFamily: Fonts.body, fontSize: 15,
  },
});

// ── Password input ─────────────────────────────────────────────────────────────
function PassInput({ value, onChange, placeholder = '••••••••', onSubmit, fwdRef }: {
  value: string; onChange: (t: string) => void;
  placeholder?: string; onSubmit?: () => void;
  fwdRef?: React.RefObject<TextInput | null>;
}) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <TextInput
        ref={fwdRef}
        style={inputStyle.base}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!show}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
      <TouchableOpacity
        onPress={() => setShow(v => !v)}
        style={passS.toggle}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={show ? 'Ocultar contraseña' : 'Ver contraseña'}
      >
        <Text style={passS.icon}>{show ? '◉' : '◎'}</Text>
      </TouchableOpacity>
    </View>
  );
}
const passS = StyleSheet.create({
  toggle: { position: 'absolute', right: 14, top: 14 },
  icon: { fontSize: 16, color: T.muted },
});

// ── CTA button ─────────────────────────────────────────────────────────────────
function Btn({ label, onPress, loading, color, style }: {
  label: string; onPress: () => void; loading: boolean; color: string; style?: object;
}) {
  return (
    <PressScale onPress={onPress} disabled={loading} accessibilityLabel={label}
      style={[btnS.btn, { backgroundColor: color }, loading && btnS.off, style]}>
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={btnS.text}>{label}</Text>}
    </PressScale>
  );
}
const btnS = StyleSheet.create({
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  off: { opacity: 0.5 },
  text: { fontFamily: Fonts.headingXBold, fontSize: 15, color: '#fff', letterSpacing: 2, textTransform: 'uppercase' },
});

// ── Ambient glow orbs ──────────────────────────────────────────────────────────
function GlowOrbs() {
  const { primary_color } = useBoxConfig();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[gS.orb, {
        width: 440, height: 440,
        top: 30, left: W / 2 - 220,
        backgroundColor: withAlpha(primary_color, 0.09),
      }]} />
      <View style={[gS.orb, {
        width: 210, height: 210,
        top: 120, left: W / 2 - 105,
        backgroundColor: withAlpha(primary_color, 0.07),
      }]} />
    </View>
  );
}
const gS = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999 },
});

// ── Slide-up card entrance ─────────────────────────────────────────────────────
function AnimatedCard({ children, style }: { children: React.ReactNode; style?: object }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 5 }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[style, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}

// ── Logo wordmark ──────────────────────────────────────────────────────────────
function Wordmark() {
  const { name, primary_color, tagline, logo_prefix, logo_highlight } = useBoxConfig();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  let first: string, second: string;
  if (logo_highlight && name.includes(logo_highlight)) {
    const idx = name.indexOf(logo_highlight);
    first = name.slice(0, idx).toUpperCase();
    second = name.slice(idx).toUpperCase();
  } else {
    const half = Math.ceil(name.length / 2);
    first = name.slice(0, half).toUpperCase();
    second = name.slice(half).toUpperCase();
  }

  const chars = name.length;
  const fs = Math.min(Math.floor((W * 0.72) / (chars * 0.42)), 88);

  return (
    <Animated.View style={[wS.wrap, { opacity: anim }]}>
      {logo_prefix ? <Text style={wS.prefix}>{logo_prefix.toUpperCase()}</Text> : null}

      {/* Accent bar with flanking lines */}
      <View style={wS.accentRow}>
        <View style={[wS.accentLine, { backgroundColor: withAlpha(primary_color, 0.35) }]} />
        <View style={[wS.accentBar, { backgroundColor: primary_color }]} />
        <View style={[wS.accentLine, { backgroundColor: withAlpha(primary_color, 0.35) }]} />
      </View>

      {/* Main wordmark with warm glow */}
      <Text
        style={[wS.name, {
          fontSize: fs,
          textShadowColor: withAlpha(primary_color, 0.5),
          textShadowRadius: 20,
          textShadowOffset: { width: 0, height: 2 },
        }]}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        <Text style={wS.nameDark}>{first}</Text>
        <Text style={[wS.nameAccent, { color: primary_color }]}>{second}</Text>
      </Text>

      <Text style={wS.tagline}>{tagline ?? 'Entrena · Compite · Mejora'}</Text>
    </Animated.View>
  );
}
const wS = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 24 },
  prefix: { fontFamily: Fonts.bodySemiBold, fontSize: 10, color: T.muted, letterSpacing: 5, marginBottom: 12 },
  accentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, width: '80%' },
  accentLine: { flex: 1, height: 1 },
  accentBar: { width: 40, height: 4, borderRadius: 2, marginHorizontal: 10 },
  name: { fontFamily: Fonts.headingXBold, color: T.text, letterSpacing: 3, lineHeight: undefined },
  nameDark: { color: T.text },
  nameAccent: {},
  tagline: { fontFamily: Fonts.body, fontSize: 11, color: T.muted, letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 12 },
});

// ── Back button ────────────────────────────────────────────────────────────────
function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={bkS.btn}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} accessibilityLabel="Volver">
      <Text style={bkS.arrow}>←</Text>
    </TouchableOpacity>
  );
}
const bkS = StyleSheet.create({
  btn: { position: 'absolute', top: 54, left: 20, zIndex: 10 },
  arrow: { color: T.muted, fontSize: 22 },
});

// ══════════════════════════════════════════════════════════════════════════════
export function LoginScreen() {
  const { needsPasswordSetup } = useAuth();
  return needsPasswordSetup ? <SetPasswordScreen /> : <SignInScreen />;
}

// ── Sign In ────────────────────────────────────────────────────────────────────
function SignInScreen() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { primary_color } = useBoxConfig();
  const passRef = useRef<TextInput>(null);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password: pass,
      });
      if (err) setError('Email o contraseña incorrectos');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) return <ForgotScreen onBack={() => setShowForgot(false)} />;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GlowOrbs />

      <View style={s.hero}>
        <Wordmark />
      </View>

      <AnimatedCard style={s.cardWrap}>
        <View style={s.card}>
          <View style={[s.cardAccent, { backgroundColor: primary_color }]} />

          <Field label="Email">
            <TextInput
              style={inputStyle.base}
              placeholder="tu@email.com"
              placeholderTextColor={T.muted}
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
              accessibilityLabel="Email"
            />
          </Field>

          <Field label="Contraseña">
            <PassInput value={pass} onChange={t => { setPass(t); setError(''); }}
              fwdRef={passRef} onSubmit={submit} />
          </Field>

          {error ? <Text style={s.error} accessibilityRole="alert">{error}</Text> : null}

          <Btn label="Entrar" onPress={submit} loading={loading} color={primary_color} style={{ marginTop: 6 }} />

          <TouchableOpacity onPress={() => setShowForgot(true)} style={s.link}>
            <Text style={s.linkText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>
      </AnimatedCard>
    </KeyboardAvoidingView>
  );
}

// ── Forgot ─────────────────────────────────────────────────────────────────────
function ForgotScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { primary_color } = useBoxConfig();

  const submit = async () => {
    if (!email.trim()) { setError('Introduce tu email'); return; }
    setError(''); setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: 'wodbox://auth/callback',
    });
    setLoading(false);
    if (err) setError('Error al enviar el email.');
    else setSent(true);
  };

  if (sent) return (
    <View style={[s.root, ctr.wrap]}>
      <Text style={ctr.emoji}>📬</Text>
      <Text style={ctr.title}>Email enviado</Text>
      <Text style={ctr.body}>Revisa tu bandeja y sigue el enlace para restablecer tu contraseña.</Text>
      <TouchableOpacity onPress={onBack} style={{ marginTop: 32 }}>
        <Text style={[s.linkText, { color: primary_color }]}>← Volver al login</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GlowOrbs />
      <BackBtn onPress={onBack} />
      <View style={s.hero}>
        <Text style={ctr.title}>Recuperar{'\n'}contraseña</Text>
        <Text style={[ctr.body, { marginTop: 8, paddingHorizontal: 20 }]}>Te enviaremos un enlace a tu email.</Text>
      </View>
      <AnimatedCard style={s.cardWrap}>
        <View style={s.card}>
          <View style={[s.cardAccent, { backgroundColor: primary_color }]} />
          <Field label="Email">
            <TextInput
              style={inputStyle.base}
              placeholder="tu@email.com"
              placeholderTextColor={T.muted}
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              autoFocus
            />
          </Field>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Btn label="Enviar enlace" onPress={submit} loading={loading} color={primary_color} style={{ marginTop: 6 }} />
        </View>
      </AnimatedCard>
    </KeyboardAvoidingView>
  );
}

// ── Set Password ───────────────────────────────────────────────────────────────
function SetPasswordScreen() {
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { primary_color } = useBoxConfig();
  const { session } = useAuth();
  const name = session?.user?.user_metadata?.name ?? 'Atleta';
  const confirmRef = useRef<TextInput>(null);

  const submit = async () => {
    setError('');
    if (pass.length < 6) { setError('Mínimo 6 caracteres'); return; }
    if (pass !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: pass, data: { invited: false } });
    setLoading(false);
    if (err) setError('Error al guardar.');
    else setDone(true);
  };

  if (done) return (
    <View style={[s.root, ctr.wrap]}>
      <Text style={ctr.emoji}>💪</Text>
      <Text style={ctr.title}>¡Bienvenido/a!</Text>
      <Text style={ctr.body}>Tu cuenta está lista. Ya puedes empezar a reservar clases.</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GlowOrbs />
      <View style={s.hero}>
        <Text style={ctr.title}>Hola,{' '}
          <Text style={{ color: primary_color }}>{name}</Text> 👋
        </Text>
        <Text style={[ctr.body, { marginTop: 8, paddingHorizontal: 20 }]}>Crea tu contraseña para continuar.</Text>
      </View>
      <AnimatedCard style={s.cardWrap}>
        <View style={s.card}>
          <View style={[s.cardAccent, { backgroundColor: primary_color }]} />
          <Field label="Nueva contraseña">
            <PassInput value={pass} onChange={t => { setPass(t); setError(''); }}
              placeholder="Mínimo 6 caracteres" onSubmit={() => confirmRef.current?.focus()} />
          </Field>
          <Field label="Confirmar contraseña">
            <PassInput value={confirm} onChange={t => { setConfirm(t); setError(''); }}
              fwdRef={confirmRef} onSubmit={submit} />
          </Field>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Btn label="Guardar y entrar" onPress={submit} loading={loading} color={primary_color} style={{ marginTop: 6 }} />
        </View>
      </AnimatedCard>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrap: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 46 : 32 },
  card: {
    backgroundColor: T.card,
    borderWidth: 1, borderColor: T.border,
    borderRadius: 20,
    paddingTop: 0, paddingHorizontal: 20, paddingBottom: 20,
    overflow: 'hidden',
  },
  cardAccent: { height: 3, marginHorizontal: -20, marginBottom: 20 },
  error: { fontFamily: Fonts.body, fontSize: 13, color: T.red, textAlign: 'center', marginBottom: 10 },
  link: { alignItems: 'center', marginTop: 18 },
  linkText: { fontFamily: Fonts.body, fontSize: 13, color: T.muted },
});

const ctr = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emoji: { fontSize: 52, marginBottom: 20 },
  title: { fontFamily: Fonts.headingXBold, fontSize: 28, color: T.text, textAlign: 'center', lineHeight: 34 },
  body: { fontFamily: Fonts.body, fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 21 },
});
