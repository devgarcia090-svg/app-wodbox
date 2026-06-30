import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import type { WodResult } from '../../hooks/useWodResults';

interface Props {
  results: WodResult[];
  myAthleteId?: string;
  loading: boolean;
  primaryColor: string;
}

const MEDALS = ['🥇', '🥈', '🥉'];

function ResultRow({ result, rank, isMe }: { result: WodResult; rank: number; isMe: boolean }) {
  const medal = rank <= 3 ? MEDALS[rank - 1] : null;
  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <View style={styles.rankCol}>
        {medal
          ? <Text style={styles.medal}>{medal}</Text>
          : <Text style={styles.rankNum}>{rank}</Text>}
      </View>
      <View style={[styles.avatar, { backgroundColor: result.athlete_color }]}>
        <Text style={styles.avatarText}>{result.athlete_initials[0]}</Text>
      </View>
      <View style={styles.nameCol}>
        <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
          {result.athlete_name}{isMe ? ' (tú)' : ''}
        </Text>
        {result.notes ? <Text style={styles.notes} numberOfLines={1}>{result.notes}</Text> : null}
      </View>
      <View style={styles.resultCol}>
        <Text style={[styles.resultText, isMe && styles.resultMe]}>{result.result_text}</Text>
        {result.rx && <View style={styles.rxBadge}><Text style={styles.rxText}>RX</Text></View>}
      </View>
    </View>
  );
}

export function WodLeaderboard({ results, myAthleteId, loading, primaryColor }: Props) {
  const rxResults = results.filter(r => r.rx);
  const scaledResults = results.filter(r => !r.rx);

  if (loading) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Cargando resultados…</Text>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🏋️</Text>
        <Text style={styles.emptyText}>Nadie ha apuntado resultado todavía</Text>
        <Text style={styles.emptySub}>¡Sé el primero!</Text>
      </View>
    );
  }

  let globalRank = 0;
  return (
    <View>
      {rxResults.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: primaryColor }]} />
            <Text style={[styles.sectionLabel, { color: primaryColor }]}>RX</Text>
            <Text style={styles.sectionCount}>{rxResults.length}</Text>
          </View>
          {rxResults.map(r => {
            globalRank++;
            return (
              <ResultRow key={r.id} result={r} rank={globalRank} isMe={r.athlete_id === myAthleteId} />
            );
          })}
        </>
      )}
      {scaledResults.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: Colors.muted }]} />
            <Text style={styles.sectionLabelScaled}>SCALED</Text>
            <Text style={styles.sectionCount}>{scaledResults.length}</Text>
          </View>
          {scaledResults.map(r => {
            globalRank++;
            return (
              <ResultRow key={r.id} result={r} rank={globalRank} isMe={r.athlete_id === myAthleteId} />
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  emptyEmoji: { fontSize: 28, marginBottom: 4 },
  emptyText: { color: Colors.muted, fontSize: 13, fontFamily: Fonts.bodySemiBold },
  emptySub: { color: Colors.muted, fontSize: 12, fontFamily: Fonts.body },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 4,
  },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionLabel: { fontSize: 10, fontFamily: Fonts.bodySemiBold, letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionLabelScaled: { fontSize: 10, fontFamily: Fonts.bodySemiBold, letterSpacing: 1.2, textTransform: 'uppercase', color: Colors.muted },
  sectionCount: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.body },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowMe: { backgroundColor: Colors.surface3, borderRadius: 8, marginHorizontal: -4, paddingHorizontal: 8, borderBottomWidth: 0, marginBottom: 1 },

  rankCol: { width: 28, alignItems: 'center' },
  medal: { fontSize: 18 },
  rankNum: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.bodySemiBold },

  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 13, color: '#fff', fontFamily: Fonts.bodySemiBold },

  nameCol: { flex: 1 },
  name: { fontSize: 13, color: Colors.white, fontFamily: Fonts.body },
  nameMe: { fontFamily: Fonts.bodySemiBold },
  notes: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body },

  resultCol: { alignItems: 'flex-end', gap: 3 },
  resultText: { fontSize: 14, color: Colors.white, fontFamily: Fonts.bodySemiBold },
  resultMe: { color: Colors.orange },
  rxBadge: {
    backgroundColor: Colors.orangeGlow, borderWidth: 1, borderColor: Colors.orange,
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  },
  rxText: { fontSize: 9, color: Colors.orange, fontFamily: Fonts.bodySemiBold, letterSpacing: 0.8 },
});
