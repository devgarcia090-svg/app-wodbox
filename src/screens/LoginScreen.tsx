import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Dimensions, Animated, Image,
} from 'react-native';
import { Colors, withAlpha } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useBoxConfig } from '../context/BoxConfigContext';

const { width: W, height: H } = Dimensions.get('window');

// ── Ambient blob ─────────────────────────────────────────────────────────────
function AmbientBlob({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 3000, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.6, duration: 3000, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', width: W * 0.9, height: W * 0.9,
      borderRadius: W * 0.45, top: -W * 0.25, alignSelf: 'center',
      backgroundColor: withAlpha(color, 0.06), opacity,
    }} />
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const { name, primary_color, tagline, logo_prefix, logo_highlight } = useBoxConfig();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // Split name for two-color display
  let first: string, second: string;
  if (logo_highlight && name.includes(logo_highlight)) {
    const idx = name.indexOf(logo_highlight);
    first = name.slice(0, idx);
    second = name.slice(idx);
  } else {
    const half = Math.ceil(name.length / 2);
    first = name.slice(0, half);
    second = name.slice(half);
  }

  return (
    <Animated.View style={[heroS.wrap, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
    }]}>
      {/* Icon badge */}
      <View style={[heroS.badge, { borderColor: withAlpha(primary_color, 0.35) }]}>
        <Image
          source={require('../../assets/icon.png')}
          style={heroS.badgeImg}
          resizeMode="cover"
        />
      </View>

      {/* Box name */}
      {logo_prefix ? <Text style={heroS.prefix}>{logo_prefix.toUpperCase()}</Text> : null}
      <Text style={heroS.name} adjustsFontSizeToFit numberOfLines={1}>
        {first}<Text style={{ color: primary_color }}>{second}</Text>
      </Text>

      {/* Tagline */}
      <Text style={heroS.tagline}>
        {tagline ?? 'Entrena · Compite · Mejora'}
      </Text>
    </Animated.View>
  );
}

const heroS = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 28 },
  badge: {
    width: 80, height: 80, borderRadius: 20,
    overflow: 'hidden', borderWidth: 1, marginBottom: 20,
    backgroundColor: '#080c18',
  },
  badgeImg: { width: 80, height: 80 },
  prefix: {
    fontFamily: Fonts.bodySemiBold, fontSize: 10,
    color: 'rgba(255,255,255,0.3)', letterSpacing: 4, marginBottom: 4,
  },
  name: {
    fontFamily: Fonts.headingXBold, fontSize: 48,
    color: '#EDEDEF', letterSpacing: 2,
  },
  tagline: {
    fontFamily: Fonts.body, fontSize: 11,
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: 2, textTransform: 'uppercase', marginTop: 8,
  },
});

// ── Glow button ───────────────────────────────────────────────────────────────
function GlowButton({ label, onPress, loading, color }: {
  label: string; onPress: () => void; loading: boolean; color: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <View style={{ marginTop: 24 }}>
      <View style={[btnS.glow, { backgroundColor: withAlpha(color, 0.28) }]} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={[btnS.btn, { backgroundColor: color }, loading && btnS.off]}
          onPress={onPress}
          onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start()}
          onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
          disabled={loading}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={btnS.text}>{label}</Text>}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const btnS = StyleSheet.create({
  glow: { position: 'absolute', left: 18, right: 18, top: 14, bottom: -6, borderRadius: 16 },
  btn: { borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  off: { opacity: 0.55 },
  text: { fontFamily: Fonts.headingXBold, fontSize: 16, color: '#fff', letterSpacing: 2.5, textTransform: 'uppercase' },
});

// ── Password with toggle ──────────────────────────────────────────────────────
function PassInput({ value, onChange, placeholder = '••••••••', onSubmit, inputRef }: {
  value: string; onChange: (t: string) => void;
  placeholder?: string; onSubmit?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
}) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <TextInput
        ref={inputRef}
        style={formS.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.2)"
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
        style={formS.eyeBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <Text style={formS.eye}>{show ? '●' : '○'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Back ──────────────────────────────────────────────────────────────────────
function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={backS.btn}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      accessibilityLabel="Volver">
      <Text style={backS.arrow}>←</Text>
    </TouchableOpacity>
  );
}
const backS = StyleSheet.create({
  btn: { position: 'absolute', top: 54, left: 24, zIndex: 10 },
  arrow: { color: 'rgba(255,255,255,0.45)', fontSize: 22 },
});

// ── Root ──────────────────────────────────────────────────────────────────────
export function LoginScreen() {
  const { needsPasswordSetup } = useAuth();
  return needsPasswordSetup ? <SetPasswordScreen /> : <SignInScreen />;
}

// ── Sign In ───────────────────────────────────────────────────────────────────
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
    <KeyboardAvoidingView style={rootS.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AmbientBlob color={primary_color} />

      {/* Hero: icon + name + tagline */}
      <View style={rootS.hero}>
        <Hero />
      </View>

      {/* Form */}
      <View style={rootS.formWrap}>
        <View style={rootS.card}>
          <Text style={formS.label}>Email</Text>
          <TextInput
            style={formS.input}
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

          <Text style={[formS.label, { marginTop: 20 }]}>Contraseña</Text>
          <PassInput
            value={password}
            onChange={t => { setPassword(t); setError(''); }}
            inputRef={passRef}
            onSubmit={handleLogin}
          />

          {error ? <Text style={formS.error} accessibilityRole="alert">{error}</Text> : null}

          <GlowButton label="Entrar" onPress={handleLogin} loading={loading} color={primary_color} />

          <TouchableOpacity onPress={() => setShowForgot(true)} style={formS.forgotBtn}>
            <Text style={formS.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Forgot Password ───────────────────────────────────────────────────────────
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

  if (sent) return (
    <View style={[rootS.bg, centS.wrap]}>
      <AmbientBlob color={primary_color} />
      <Text style={centS.emoji}>📬</Text>
      <Text style={centS.title}>Email enviado</Text>
      <Text style={centS.body}>Revisa tu bandeja y sigue el enlace para restablecer tu contraseña.</Text>
      <TouchableOpacity onPress={onBack} style={{ marginTop: 32 }}>
        <Text style={[formS.forgotText, { color: primary_color }]}>← Volver al login</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView style={rootS.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AmbientBlob color={primary_color} />
      <BackBtn onPress={onBack} />
      <View style={rootS.hero}>
        <Text style={centS.title}>Recuperar{'\n'}contraseña</Text>
        <Text style={[centS.body, { marginTop: 8, paddingHorizontal: 28 }]}>Te enviaremos un enlace a tu email.</Text>
      </View>
      <View style={rootS.formWrap}>
        <View style={rootS.card}>
          <Text style={formS.label}>Email</Text>
          <TextInput
            style={formS.input}
            placeholder="tu@email.com"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            autoFocus
          />
          {error ? <Text style={formS.error}>{error}</Text> : null}
          <GlowButton label="Enviar enlace" onPress={handleReset} loading={loading} color={primary_color} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Set Password ──────────────────────────────────────────────────────────────
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

  const handle = async () => {
    setError('');
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password, data: { invited: false } });
    setLoading(false);
    if (err) setError('Error al guardar. Inténtalo de nuevo.');
    else setDone(true);
  };

  if (done) return (
    <View style={[rootS.bg, centS.wrap]}>
      <AmbientBlob color={primary_color} />
      <Text style={centS.emoji}>💪</Text>
      <Text style={centS.title}>¡Bienvenido/a!</Text>
      <Text style={centS.body}>Tu cuenta está lista. Ya puedes empezar a reservar clases.</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={rootS.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AmbientBlob color={primary_color} />
      <View style={rootS.hero}>
        <Text style={centS.title}>
          Hola, <Text style={{ color: primary_color }}>{name}</Text> 👋
        </Text>
        <Text style={[centS.body, { marginTop: 8, paddingHorizontal: 28 }]}>Crea tu contraseña para continuar.</Text>
      </View>
      <View style={rootS.formWrap}>
        <View style={rootS.card}>
          <Text style={formS.label}>Nueva contraseña</Text>
          <PassInput value={password} onChange={t => { setPassword(t); setError(''); }}
            placeholder="Mínimo 6 caracteres" onSubmit={() => confirmRef.current?.focus()} />

          <Text style={[formS.label, { marginTop: 20 }]}>Confirmar contraseña</Text>
          <PassInput value={confirm} onChange={t => { setConfirm(t); setError(''); }}
            inputRef={confirmRef} onSubmit={handle} />

          {error ? <Text style={formS.error}>{error}</Text> : null}
          <GlowButton label="Guardar y entrar" onPress={handle} loading={loading} color={primary_color} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const rootS = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#060810' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: H * 0.3, maxHeight: H * 0.46 },
  formWrap: { paddingHorizontal: 22, paddingBottom: Platform.OS === 'ios' ? 46 : 32 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 22,
  },
});

const formS = StyleSheet.create({
  label: {
    fontFamily: Fonts.bodySemiBold, fontSize: 10,
    color: 'rgba(255,255,255,0.38)', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 8,
  },
  input: {
    fontFamily: Fonts.body, fontSize: 16, color: '#EDEDEF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 11, paddingHorizontal: 0, paddingRight: 32,
  },
  eyeBtn: { position: 'absolute', right: 0, bottom: 10 },
  eye: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  error: { fontFamily: Fonts.body, fontSize: 13, color: Colors.red, marginTop: 12, textAlign: 'center' },
  forgotBtn: { alignItems: 'center', marginTop: 18, paddingBottom: 2 },
  forgotText: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.28)' },
});

const centS = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emoji: { fontSize: 52, marginBottom: 20 },
  title: { fontFamily: Fonts.headingXBold, fontSize: 30, color: '#EDEDEF', letterSpacing: 1, textAlign: 'center', lineHeight: 36 },
  body: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.32)', textAlign: 'center', lineHeight: 21 },
});
