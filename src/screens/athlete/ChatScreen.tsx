import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Colors, withAlpha } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useBoxConfig } from '../../context/BoxConfigContext';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';

type Tab = 'general' | 'dm';

interface ChatMessage {
  id: string;
  text: string;
  sender_id: string;
  sender_name: string;
  sender_initials: string;
  sender_color: string;
  is_broadcast: boolean;
  created_at: string;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function ChatScreen() {
  const { session, profile } = useAuth();
  const boxConfig = useBoxConfig();
  const { primary_color } = boxConfig;
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const { toast, showToast } = useToast();

  // Broadcast
  const [broadcasts, setBroadcasts] = useState<ChatMessage[]>([]);
  const [bcLoading, setBcLoading] = useState(true);
  const [bcInput, setBcInput] = useState('');
  const bcScroll = useRef<ScrollView>(null);

  // DM with box
  const [convId, setConvId] = useState<string | null>(null);
  const [dmMsgs, setDmMsgs] = useState<ChatMessage[]>([]);
  const [dmLoading, setDmLoading] = useState(true);
  const [dmInput, setDmInput] = useState('');
  const dmScroll = useRef<ScrollView>(null);

  // RLS on `profiles` only lets you read your own row, so embedding
  // `profiles!messages_sender_id_fkey(...)` came back null for the admin's
  // name/avatar. Look senders up separately through public_profiles.
  const resolveSenders = useCallback(async (rows: any[]) => {
    const ids = [...new Set(rows.map(m => m.sender_id).filter(Boolean))];
    if (ids.length === 0) return new Map<string, any>();
    const { data } = await supabase.rpc('public_profiles', { p_ids: ids });
    return new Map((data ?? []).map((p: any) => [p.id, p]));
  }, []);

  const fetchBroadcasts = useCallback(async () => {
    setBcLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('id, text, sender_id, is_broadcast, created_at')
      .eq('is_broadcast', true)
      .order('created_at');

    if (error) { showToast('Error al cargar el chat', 'error'); setBcLoading(false); return; }

    const senders = await resolveSenders((data || []) as any[]);
    setBroadcasts(
      ((data || []) as any[]).map(m => {
        const p = senders.get(m.sender_id);
        return {
          id: m.id,
          text: m.text,
          sender_id: m.sender_id,
          sender_name: p?.name ?? boxConfig.name,
          sender_initials: p?.avatar_initials ?? 'CF',
          sender_color: p?.avatar_color ?? Colors.orange,
          is_broadcast: true,
          created_at: m.created_at,
        };
      })
    );
    setBcLoading(false);
  }, [resolveSenders]);

  const getOrCreateConv = useCallback(async () => {
    if (!session?.user.id) return null;
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('athlete_id', session.user.id)
      .maybeSingle();
    if (existing?.id) return existing.id;
    const { data: created } = await supabase
      .from('conversations')
      .insert({ athlete_id: session.user.id })
      .select('id')
      .single();
    return created?.id ?? null;
  }, [session?.user.id]);

  const fetchDMs = useCallback(async (cid: string) => {
    setDmLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('id, text, sender_id, created_at')
      .eq('conversation_id', cid)
      .order('created_at');

    if (error) { showToast('Error al cargar la conversación', 'error'); setDmLoading(false); return; }

    const senders = await resolveSenders((data || []) as any[]);
    setDmMsgs(
      ((data || []) as any[]).map(m => {
        const p = senders.get(m.sender_id);
        return {
          id: m.id,
          text: m.text,
          sender_id: m.sender_id,
          sender_name: p?.name ?? '—',
          sender_initials: p?.avatar_initials ?? '?',
          sender_color: p?.avatar_color ?? Colors.muted,
          is_broadcast: false,
          created_at: m.created_at,
        };
      })
    );
    setDmLoading(false);
  }, [resolveSenders]);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  useEffect(() => {
    if (activeTab === 'dm') {
      (async () => {
        const cid = await getOrCreateConv();
        if (cid) { setConvId(cid); fetchDMs(cid); }
        else setDmLoading(false);
      })();
    }
  }, [activeTab, getOrCreateConv, fetchDMs]);

  const sendBroadcast = async () => {
    if (!bcInput.trim() || !session?.user.id) return;
    const text = bcInput.trim();
    const { error } = await supabase.from('messages').insert({
      sender_id: session.user.id,
      text,
      is_broadcast: true,
      conversation_id: null,
    });
    if (!error) {
      setBcInput('');
      fetchBroadcasts();
      setTimeout(() => bcScroll.current?.scrollToEnd(), 200);
    } else {
      showToast('Error al enviar el mensaje', 'error');
    }
  };

  const sendDM = async () => {
    if (!dmInput.trim() || !session?.user.id || !convId) return;
    const text = dmInput.trim();
    if (text.length > 5000) return;
    const { error } = await supabase.from('messages').insert({
      sender_id: session.user.id,
      text,
      is_broadcast: false,
      conversation_id: convId,
    });
    if (!error) {
      setDmInput('');
      await supabase.from('conversations').update({
        last_preview: text.slice(0, 100),
        last_at: nowIso(),
      }).eq('id', convId);
      fetchDMs(convId);
      setTimeout(() => dmScroll.current?.scrollToEnd(), 200);
    } else {
      showToast('Error al enviar el mensaje', 'error');
    }
  };

  const isMyMsg = (msg: ChatMessage) => msg.sender_id === session?.user.id;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'general' && { borderBottomColor: primary_color }]}
          onPress={() => setActiveTab('general')}
        >
          <Text style={[styles.tabText, activeTab === 'general' && { color: primary_color }]}>📢 General</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'dm' && { borderBottomColor: primary_color }]}
          onPress={() => setActiveTab('dm')}
        >
          <Text style={[styles.tabText, activeTab === 'dm' && { color: primary_color }]}>💬 Mensajes</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'general' && (
        <>
          {bcLoading ? (
            <ActivityIndicator color={primary_color} style={{ flex: 1 }} />
          ) : (
            <ScrollView ref={bcScroll} style={styles.msgList} contentContainerStyle={styles.msgContent}>
              {broadcasts.map(msg => {
                const mine = isMyMsg(msg);
                if (!mine) {
                  return (
                    <View key={msg.id} style={msgStyles.broadcastWrap}>
                      <Text style={[msgStyles.broadcastLabel, { color: primary_color }]}>📢 {msg.sender_name}</Text>
                      <View style={[msgStyles.broadcastBubble, { borderColor: primary_color, backgroundColor: withAlpha(primary_color, 0.1) }]}>
                        <Text style={msgStyles.broadcastText}>{msg.text}</Text>
                      </View>
                      <Text style={msgStyles.time}>{fmtTime(msg.created_at)}</Text>
                    </View>
                  );
                }
                return (
                  <View key={msg.id} style={[msgStyles.msg, msgStyles.mine]}>
                    <View style={[msgStyles.bubble, { backgroundColor: primary_color, borderTopRightRadius: 4 }]}>
                      <Text style={[msgStyles.text, msgStyles.textMine]}>{msg.text}</Text>
                    </View>
                    <Text style={msgStyles.time}>{fmtTime(msg.created_at)}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={Colors.muted}
              value={bcInput}
              onChangeText={setBcInput}
              onSubmitEditing={sendBroadcast}
              returnKeyType="send"
            />
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: primary_color }]} onPress={sendBroadcast}>
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {activeTab === 'dm' && (
        <>
          <View style={styles.dmConvHeader}>
            <View style={[styles.dmConvAvatar, { backgroundColor: primary_color }]}>
              <Text style={styles.dmConvAvatarText}>CF</Text>
            </View>
            <View>
              <Text style={styles.dmConvName}>{boxConfig.name}</Text>
              <Text style={styles.dmConvSub}>Administración del box</Text>
            </View>
          </View>

          {dmLoading ? (
            <ActivityIndicator color={primary_color} style={{ flex: 1 }} />
          ) : (
            <ScrollView ref={dmScroll} style={styles.msgList} contentContainerStyle={styles.msgContent}>
              {dmMsgs.length === 0 && (
                <Text style={{ color: Colors.muted, fontFamily: Fonts.body, fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                  Escribe tu primer mensaje al box
                </Text>
              )}
              {dmMsgs.map(msg => {
                const mine = isMyMsg(msg);
                return (
                  <View key={msg.id} style={[msgStyles.msg, mine ? msgStyles.mine : msgStyles.theirs]}>
                    {!mine && (
                      <Text style={msgStyles.sender}>{msg.sender_name}</Text>
                    )}
                    <View style={[msgStyles.bubble, mine ? { backgroundColor: primary_color, borderTopRightRadius: 4 } : msgStyles.bubbleTheirs]}>
                      <Text style={[msgStyles.text, mine && msgStyles.textMine]}>{msg.text}</Text>
                    </View>
                    <Text style={msgStyles.time}>{fmtTime(msg.created_at)}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Mensaje al box..."
              placeholderTextColor={Colors.muted}
              value={dmInput}
              onChangeText={setDmInput}
              onSubmitEditing={sendDM}
              returnKeyType="send"
            />
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: primary_color }]} onPress={sendDM}>
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      <Toast {...toast} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.muted },
  msgList: { flex: 1 },
  msgContent: { padding: 16, gap: 10 },
  inputBar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.white,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 18 },
  dmConvHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dmConvAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dmConvAvatarText: { fontFamily: Fonts.headingXBold, fontSize: 13, color: '#fff' },
  dmConvName: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.white },
  dmConvSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body },
});

const msgStyles = StyleSheet.create({
  msg: { maxWidth: '78%', gap: 3 },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end', marginLeft: 'auto' },
  theirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.bodySemiBold, paddingHorizontal: 4 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleTheirs: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopLeftRadius: 4,
  },
  text: { fontSize: 13, color: Colors.white, fontFamily: Fonts.body, lineHeight: 19 },
  textMine: { color: '#fff' },
  time: { fontSize: 10, color: Colors.muted, paddingHorizontal: 4, fontFamily: Fonts.body },
  broadcastWrap: { gap: 3 },
  broadcastLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  broadcastBubble: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  broadcastText: { fontSize: 13, color: Colors.white, fontFamily: Fonts.body, lineHeight: 19 },
});
