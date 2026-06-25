import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import type { ClassItem } from '../../data/mockData';

interface ClassCardProps {
  item: ClassItem;
  onPress: (item: ClassItem) => void;
}

export function ClassCard({ item, onPress }: ClassCardProps) {
  const accentColor =
    item.status === 'reserved' ? Colors.green :
    item.status === 'full' ? Colors.red :
    Colors.orange;

  const badgeVariant =
    item.status === 'reserved' ? 'orange' :
    item.status === 'full' ? 'red' : 'green';

  const badgeLabel =
    item.status === 'reserved' ? 'Reservada ✓' :
    item.status === 'full' ? 'Llena' : 'Plazas libres';

  const free = item.capacity - item.enrolled;

  return (
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
      <View style={styles.bottom}>
        <View style={styles.avatars}>
          {item.avatars.slice(0, 3).map((av, i) => (
            <View key={i} style={{ marginLeft: i === 0 ? 0 : -6 }}>
              <Avatar url={av.url} initials={av.initial} color={av.color} size={24} fontSize={10} borderColor={Colors.surface} borderWidth={2} />
            </View>
          ))}
          {item.enrolled > 3 && (
            <Text style={styles.moreText}>+{item.enrolled - 3} más</Text>
          )}
        </View>
        {item.status === 'full' ? (
          <Text style={styles.fullText}>Clase completa</Text>
        ) : (
          <Text style={styles.freeText}><Text style={styles.freeNum}>{free}</Text> libres</Text>
        )}
      </View>

      {item.attendees.length > 0 && (
        <View style={styles.attendeesSection}>
          <Text style={styles.attendeesLabel}>Quién viene</Text>
          <View style={styles.attendeesGrid}>
            {item.attendees.map((att, i) => (
              <View key={i} style={styles.attendeeItem}>
                <Avatar url={att.url} initials={att.initials} color={att.color} size={40} fontSize={13} />
                <Text style={styles.attendeeName} numberOfLines={1}>{att.name.split(' ')[0]}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
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
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  avatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    color: '#fff',
  },
  moreText: {
    fontSize: 11,
    color: Colors.muted,
    fontFamily: Fonts.body,
    marginLeft: 8,
  },
  freeText: {
    fontSize: 12,
    color: Colors.muted,
    fontFamily: Fonts.body,
  },
  freeNum: {
    color: Colors.white,
    fontFamily: Fonts.bodySemiBold,
  },
  fullText: {
    fontSize: 12,
    color: Colors.red,
    fontFamily: Fonts.bodySemiBold,
  },
  attendeesSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 12,
    paddingTop: 10,
  },
  attendeesLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  attendeesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  attendeeItem: {
    alignItems: 'center',
    width: 48,
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  attendeeInitials: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: '#fff',
  },
  attendeeName: {
    fontSize: 10,
    color: Colors.muted,
    fontFamily: Fonts.body,
    textAlign: 'center',
  },
});
