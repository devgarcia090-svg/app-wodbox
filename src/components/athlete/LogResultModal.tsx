import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, Switch, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Button } from '../common/Button';

interface Props {
  visible: boolean;
  initialText?: string;
  initialRx?: boolean;
  initialNotes?: string;
  primaryColor: string;
  onSave: (resultText: string, rx: boolean, notes: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export function LogResultModal({
  visible, initialText = '', initialRx = false, initialNotes = '',
  primaryColor, onSave, onDelete, onClose,
}: Props) {
  const [resultText, setResultText] = useState(initialText);
  const [rx, setRx] = useState(initialRx);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setResultText(initialText);
      setRx(initialRx);
      setNotes(initialNotes);
      setError('');
    }
  }, [visible, initialText, initialRx, initialNotes]);

  const handleSave = async () => {
    if (!resultText.trim()) { setError('Escribe tu resultado'); return; }
    setSaving(true);
    try {
      await onSave(resultText, rx, notes);
      onClose();
    } catch {
      setError('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch {
      setError('Error al borrar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Apuntar resultado</Text>
          <Text style={styles.label}>Resultado *</Text>
          <TextInput
            style={styles.input}
            value={resultText}
            onChangeText={v => { setResultText(v); setError(''); }}
            placeholder="12:34  ·  5+12 reps  ·  100kg"
            placeholderTextColor={Colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.rxRow}>
            <View style={styles.rxLeft}>
              <Text style={styles.rxTitle}>RX</Text>
              <Text style={styles.rxSub}>Sin modificar el WOD</Text>
            </View>
            <Switch
              value={rx}
              onValueChange={setRx}
              trackColor={{ false: Colors.border, true: primaryColor }}
              thumbColor={Colors.white}
            />
          </View>
          <Text style={styles.label}>Notas (opcional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Cómo ha ido, sensaciones…"
            placeholderTextColor={Colors.muted}
            multiline
            numberOfLines={2}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            {onDelete && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={saving}>
                <Text style={styles.deleteText}>Borrar</Text>
              </TouchableOpacity>
            )}
            <Button label="Cancelar" variant="secondary" onPress={onClose} style={styles.flex1} />
            <Button label={saving ? '…' : 'Guardar'} variant="primary" onPress={handleSave} style={styles.flex1} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
    padding: 24, paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  title: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.white, marginBottom: 20 },
  label: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.bodySemiBold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 12, color: Colors.white,
    fontFamily: Fonts.body, fontSize: 15, marginBottom: 16,
  },
  inputMulti: { height: 70, textAlignVertical: 'top' },
  rxRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 12, marginBottom: 16,
  },
  rxLeft: { gap: 2 },
  rxTitle: { fontSize: 14, color: Colors.white, fontFamily: Fonts.bodySemiBold },
  rxSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body },
  error: { color: Colors.red, fontSize: 12, fontFamily: Fonts.body, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  flex1: { flex: 1 },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  deleteText: { color: Colors.red, fontSize: 13, fontFamily: Fonts.bodySemiBold },
});
