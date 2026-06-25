import React, { useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Modal, Image, Dimensions } from 'react-native';
import { Colors, withAlpha } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { useBoxConfig } from '../../context/BoxConfigContext';
import type { ClassItem } from '../../data/mockData';

const SLOTS_PER_ROW = 6;
const SLOT_GAP = 5;
const CARD_H_PADDING = 16 + 19 + 32; // paddingLeft + padding + 2*marginHorizontal
const SLOT_SIZE = Math.floor((Dimensions.get('window').width - CARD_H_PADDING - (SLOTS_PER_ROW - 1) * SLOT_GAP) / SLOTS_PER_ROW);
const SLOT_RADIUS = Math.round(SLOT_SIZE * 0.22);

interface ClassCardProps {
  item: ClassItem;
  onPress: (item: ClassItem) => void;
}

export function ClassCard({ item, onPress }: ClassCardProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const { primary_color } = useBoxConfig();

  const accentColor =
    item.status === 'reserved' ? Colors.green :
    item.status === 'full' ? Colors.red :
    primary_color;

  const badgeVariant =
    item.status === 'reserved' ? 'orange' :
    item.status === 'full' ? 'red' : 'green';

  const badgeLabel =
    item.status === 'reserved' ? 'Reservada ✓' :
    item.status === 'full' ? 'Llena' : 'Plazas libres';

  const free = item.capacity - item.enrolled;

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.8}>
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
        <View style={styles.top}>
          <Text style={styles.time}>{item.time}</Text>
          <Badge label={badgeLabel} variant={badgeVariant} />
        </View>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>👤 {item.coach}</Text>
          <Text style={styles.metaText}>⏱ {item.duration}</Text>
        </View>
        <View style={styles.slotsRow}>
          <Text style={[styles.spotsText, item.status === 'full' && { color: Colors.red }]}>
            {item.enrolled}/{item.capacity}
          </Text>
          {item.status === 'full' && <Text style={styles.fullLabel}>LLENA</Text>}
        </View>
        <View style={styles.slotsGrid}>
          {Array.from({ length: item.capacity }, (_, i) => {
            const att = item.attendees[i];
            const isEnrolled = i < item.enrolled;
            if (att) {
              return (
                <Avatar
                  key={i}
                  url={att.url}
                  initials={att.initials}
                  color={att.color}
                  size={SLOT_SIZE}
                  square
                  onPress={att.url ? () => setLightboxUrl(att.url!) : undefined}
                />
              );
            }
            if (isEnrolled) {
              return (
                <View key={i} style={[styles.slotGhost, { borderColor: primary_color, backgroundColor: withAlpha(primary_color, 0.15) }]}>
                  <Text style={[styles.slotGhostText, { color: primary_color }]}>?</Text>
                </View>
              );
            }
            return <View key={i} style={styles.slotEmpty} />;
          })}
        </View>
      </TouchableOpacity>

      <Modal visible={!!lightboxUrl} transparent animationType="fade" onRequestClose={() => setLightboxUrl(null)}>
        <TouchableOpacity
          style={lightboxStyles.backdrop}
          onPress={() => setLightboxUrl(null)}
          activeOpacity={1}
        >
          {lightboxUrl && (
            <Image
              source={{ uri: lightboxUrl }}
              style={lightboxStyles.image}
              resizeMode="cover"
            />
          )}
          <Text style={lightboxStyles.hint}>Toca para cerrar</Text>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    paddingLeft: 19,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  time: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: Colors.white,
  },
  name: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.white,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaText: {
    fontSize: 12,
    color: Colors.muted,
    fontFamily: Fonts.body,
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 10,
  },
  spotsText: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.white },
  fullLabel: { fontSize: 10, color: Colors.red, fontFamily: Fonts.bodySemiBold },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SLOT_GAP,
  },
  slotEmpty: {
    width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: SLOT_RADIUS,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  slotGhost: {
    width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: SLOT_RADIUS,
    borderWidth: 1, borderColor: Colors.orange,
    backgroundColor: Colors.orangeGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  slotGhostText: { color: Colors.orange, fontSize: SLOT_SIZE * 0.45, fontFamily: Fonts.bodySemiBold },
});

const lightboxStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '82%',
    aspectRatio: 1,
    borderRadius: 14,
  },
  hint: {
    marginTop: 18,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontFamily: Fonts.body,
  },
});
