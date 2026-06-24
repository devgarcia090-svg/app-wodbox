import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Button } from '../common/Button';
import type { ClassItem } from '../../data/mockData';

interface ClassModalProps {
  item: ClassItem | null;
  onClose: () => void;
  onAction: (msg: string, type: 'success' | 'error') => void;
}

export function ClassModal({ item, onClose, onAction }: ClassModalProps) {
  if (!item) return null;

  const handleAction = () => {
    if (item.status === 'reserved') {
      onAction('Reserva cancelada', 'error');
    } else if (item.status === 'full') {
      onAction('📋 Apuntado a lista de espera', 'success');
    } else {
      onAction('✅ Plaza reservada', 'success');
    }
    onClose();
  };

  const free = item.capacity - item.enrolled;
  const meta = `👤 ${item.coach}  ·  👥 ${item.enrolled}/${item.capacity}  ·  ${
    item.status === 'reserved' ? 'Tu plaza está confirmada' :
    item.status === 'full' ? 'Clase completa' :
    `${free} plaza${free !== 1 ? 's' : ''} libre${free !== 1 ? 's' : ''}`
  }`;

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{item.name} · {item.time}</Text>
            <Text style={styles.sub}>{meta}</Text>
            <View style={styles.wodBox}>
              <Text style={styles.wodLabel}>WOD DE HOY</Text>
              <Text style={styles.wodText}>{item.wod}</Text>
            </View>
            <View style={styles.actions}>
              {item.status === 'reserved' ? (
                <>
                  <Button label="Cancelar reserva" variant="danger" onPress={handleAction} style={styles.flex1} />
                  <Button label="Cerrar" variant="secondary" onPress={onClose} style={styles.flex1} />
                </>
              ) : item.status === 'full' ? (
                <>
                  <Button label="Lista de espera" variant="ghost" onPress={handleAction} style={styles.flex1} />
                  <Button label="Cerrar" variant="secondary" onPress={onClose} style={styles.flex1} />
                </>
              ) : (
                <>
                  <Button label="Reservar plaza" variant="primary" onPress={handleAction} style={styles.flex1} />
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
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
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.white,
    marginBottom: 4,
  },
  sub: {
    color: Colors.muted,
    fontSize: 13,
    fontFamily: Fonts.body,
    marginBottom: 20,
  },
  wodBox: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  wodLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.orange,
    fontFamily: Fonts.bodySemiBold,
    marginBottom: 8,
  },
  wodText: {
    fontSize: 13,
    color: Colors.white,
    fontFamily: Fonts.body,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
});
