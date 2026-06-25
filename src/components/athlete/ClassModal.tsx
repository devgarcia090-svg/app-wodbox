import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Button } from '../common/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useBoxConfig } from '../../context/BoxConfigContext';
import type { ClassItem } from '../../data/mockData';

interface ClassModalProps {
  item: ClassItem | null;
  onClose: () => void;
  onAction: (msg: string, type: 'success' | 'error') => void;
  onRefresh: () => void;
}

export function ClassModal({ item, onClose, onAction, onRefresh }: ClassModalProps) {
  const { session } = useAuth();
  const { primary_color } = useBoxConfig();
  const [busy, setBusy] = useState(false);

  if (!item) return null;

  const handleAction = async () => {
    if (!session) return;
    setBusy(true);
    try {
      if (item.status === 'reserved') {
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('class_id', item.id)
          .eq('athlete_id', session.user.id);
        if (error) throw error;
        onAction('Reserva cancelada', 'error');
      } else if (item.status === 'full') {
        const { error } = await supabase
          .from('bookings')
          .upsert(
            { class_id: item.id, athlete_id: session.user.id, status: 'waitlist' },
            { onConflict: 'class_id,athlete_id' },
          );
        if (error) throw error;
        onAction('📋 Apuntado a lista de espera', 'success');
      } else {
        const { error } = await supabase
          .from('bookings')
          .upsert(
            { class_id: item.id, athlete_id: session.user.id, status: 'confirmed' },
            { onConflict: 'class_id,athlete_id' },
          );
        if (error) throw error;
        onAction('✅ Plaza reservada', 'success');
      }
      onRefresh();
      onClose();
    } catch {
      onAction('Error al procesar. Inténtalo de nuevo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const free = item.capacity - item.enrolled;
  const meta = `👤 ${item.coach}  ·  👥 ${item.enrolled}/${item.capacity}  ·  ${
    item.status === 'reserved' ? 'Tu plaza está confirmada' :
    item.status === 'full' ? 'Clase completa' :
    `${free} plaza${free !== 1 ? 's' : ''} libre${free !== 1 ? 's' : ''}`
  }`;

  const isPast = (() => {
    const classEnd = new Date(`${item.date}T${item.time}:00`);
    classEnd.setHours(classEnd.getHours() + 1);
    return classEnd < new Date();
  })();

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{item.name} · {item.time}</Text>
            <Text style={styles.sub}>{meta}</Text>
            <View style={styles.wodBox}>
              <Text style={[styles.wodLabel, { color: primary_color }]}>WOD DE HOY</Text>
              <Text style={styles.wodText}>{item.wod}</Text>
            </View>
            <View style={styles.actions}>
              {isPast ? (
                <>
                  <View style={[styles.flex1, styles.pastBox]}>
                    <Text style={styles.pastText}>Esta clase ya ha pasado</Text>
                  </View>
                  <Button label="Cerrar" variant="secondary" onPress={onClose} style={styles.flex1} />
                </>
              ) : item.status === 'reserved' ? (
                <>
                  <Button label={busy ? '...' : 'Cancelar reserva'} variant="danger" onPress={handleAction} style={styles.flex1} />
                  <Button label="Cerrar" variant="secondary" onPress={onClose} style={styles.flex1} />
                </>
              ) : item.status === 'full' ? (
                <>
                  <Button label={busy ? '...' : 'Lista de espera'} variant="ghost" onPress={handleAction} style={styles.flex1} />
                  <Button label="Cerrar" variant="secondary" onPress={onClose} style={styles.flex1} />
                </>
              ) : (
                <>
                  <Button label={busy ? '...' : 'Reservar plaza'} variant="primary" onPress={handleAction} style={styles.flex1} />
                  <Button label="Cerrar" variant="secondary" onPress={onClose} style={styles.flex1} />
                </>
              )}
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  title: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.white, marginBottom: 4 },
  sub: { color: Colors.muted, fontSize: 13, fontFamily: Fonts.body, marginBottom: 20 },
  wodBox: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: 14, marginBottom: 16,
  },
  wodLabel: {
    fontSize: 10, textTransform: 'uppercase', letterSpacing: 1,
    color: Colors.orange, fontFamily: Fonts.bodySemiBold, marginBottom: 8,
  },
  wodText: { fontSize: 13, color: Colors.white, fontFamily: Fonts.body, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  pastBox: {
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12,
  },
  pastText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.bodySemiBold },
});
