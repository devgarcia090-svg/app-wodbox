import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { ATHLETE_DMS } from '../../data/mockData';

type Tab = 'general' | 'dm';

interface Message {
  id: string;
  text: string;
  mine: boolean;
  sender?: string;
  time: string;
  broadcast?: boolean;
}

const INITIAL_GENERAL: Message[] = [
  { id: '1', text: '¡Buenos días equipo! 🔥 Hoy la clase de las 12:00 está completa. Si queréis plaza para las 18:00, apuntaos ya.', mine: false, time: '08:15', broadcast: true },
  { id: '2', text: '🏆 ¡Enhorabuena a Carlos y Laura por su PR en Clean & Jerk! Así se trabaja 💪', mine: false, time: '19:45', broadcast: true },
  { id: '3', text: 'Para la clase de mañana a las 7, traed zapatillas de running 🏃', mine: false, sender: 'Sara Martínez (Coach)', time: '20:10' },
  { id: '4', text: '¡Perfecto! ¿Necesitamos también el chaleco?', mine: true, time: '20:14' },
  { id: '5', text: 'No hace falta, sin chaleco 👌', mine: false, sender: 'Sara Martínez (Coach)', time: '20:16' },
  { id: '6', text: '¿Alguien más para la clase de las 18:00? 🙋‍♀️', mine: false, sender: 'Ana Pérez', time: '10:32' },
];

export function ChatScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [generalMsgs, setGeneralMsgs] = useState<Message[]>(INITIAL_GENERAL);
  const [generalInput, setGeneralInput] = useState('');
  const [activeDM, setActiveDM] = useState<string | null>(null);
  const [dmMsgs, setDmMsgs] = useState<Record<string, Message[]>>({});
  const [dmInput, setDmInput] = useState('');
  const generalScroll = useRef<ScrollView>(null);
  const dmScroll = useRef<ScrollView>(null);

  const now = () => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const sendGeneral = () => {
    if (!generalInput.trim()) return;
    setGeneralMsgs(prev => [...prev, { id: String(Date.now()), text: generalInput.trim(), mine: true, time: now() }]);
    setGeneralInput('');
    setTimeout(() => generalScroll.current?.scrollToEnd(), 100);
  };

  const openDM = (id: string) => {
    setActiveDM(id);
    if (!dmMsgs[id]) {
      const dm = ATHLETE_DMS.find(d => d.id === id)!;
      setDmMsgs(prev => ({
        ...prev,
        [id]: dm.messages.map((m, i) => ({ id: String(i), text: m, mine: false, time: 'Hoy' })),
      }));
    }
  };

  const sendDM = () => {
    if (!dmInput.trim() || !activeDM) return;
    setDmMsgs(prev => ({
      ...prev,
      [activeDM]: [...(prev[activeDM] || []), { id: String(Date.now()), text: dmInput.trim(), mine: true, time: now() }],
    }));
    setDmInput('');
    setTimeout(() => dmScroll.current?.scrollToEnd(), 100);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'general' && styles.tabBtnActive]} onPress={() => setActiveTab('general')}>
          <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>📢 General</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'dm' && styles.tabBtnActive]} onPress={() => setActiveTab('dm')}>
          <Text style={[styles.tabText, activeTab === 'dm' && styles.tabTextActive]}>💬 Mensajes directos</Text>
        </TouchableOpacity>
      </View>

      {/* General chat */}
      {activeTab === 'general' && (
        <>
          <ScrollView ref={generalScroll} style={styles.msgList} contentContainerStyle={styles.msgContent}>
            {generalMsgs.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </ScrollView>
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={Colors.muted}
              value={generalInput}
              onChangeText={setGeneralInput}
              onSubmitEditing={sendGeneral}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendGeneral}>
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* DMs */}
      {activeTab === 'dm' && !activeDM && (
        <ScrollView>
          {ATHLETE_DMS.map(dm => (
            <TouchableOpacity key={dm.id} style={styles.dmItem} onPress={() => openDM(dm.id)}>
              <View style={[styles.dmAvatar, { backgroundColor: dm.color }]}>
                <Text style={styles.dmAvatarText}>{dm.initials}</Text>
                {dm.unread > 0 && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.dmInfo}>
                <Text style={styles.dmName}>{dm.name}</Text>
                <Text style={styles.dmPreview} numberOfLines={1}>{dm.preview}</Text>
              </View>
              <View style={styles.dmMeta}>
                <Text style={styles.dmTime}>{dm.time}</Text>
                {dm.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{dm.unread}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {activeTab === 'dm' && activeDM && (
        <>
          <View style={styles.dmConvHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setActiveDM(null)}>
              <Text style={styles.backBtnText}>‹</Text>
            </TouchableOpacity>
            {(() => {
              const dm = ATHLETE_DMS.find(d => d.id === activeDM)!;
              return (
                <>
                  <View style={[styles.dmConvAvatar, { backgroundColor: dm.color }]}>
                    <Text style={styles.dmConvAvatarText}>{dm.initials}</Text>
                  </View>
                  <View>
                    <Text style={styles.dmConvName}>{dm.name}</Text>
                    <Text style={styles.dmConvSub}>CrossFit Murcia</Text>
                  </View>
                </>
              );
            })()}
          </View>
          <ScrollView ref={dmScroll} style={styles.msgList} contentContainerStyle={styles.msgContent}>
            {(dmMsgs[activeDM] || []).map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </ScrollView>
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={Colors.muted}
              value={dmInput}
              onChangeText={setDmInput}
              onSubmitEditing={sendDM}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendDM}>
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.broadcast) {
    return (
      <View style={msgStyles.broadcastWrap}>
        <Text style={msgStyles.broadcastLabel}>📢 CrossFit Murcia</Text>
        <View style={msgStyles.broadcastBubble}>
          <Text style={msgStyles.broadcastText}>{msg.text}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[msgStyles.msg, msg.mine ? msgStyles.mine : msgStyles.theirs]}>
      {!msg.mine && msg.sender && <Text style={msgStyles.sender}>{msg.sender}</Text>}
      <View style={[msgStyles.bubble, msg.mine ? msgStyles.bubbleMine : msgStyles.bubbleTheirs]}>
        <Text style={[msgStyles.text, msg.mine && msgStyles.textMine]}>{msg.text}</Text>
      </View>
      <Text style={msgStyles.time}>{msg.time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: Colors.orange },
  tabText: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.muted },
  tabTextActive: { color: Colors.orange },
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
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 18 },
  dmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dmAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dmAvatarText: { fontFamily: Fonts.headingXBold, fontSize: 17, color: '#fff' },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.orange,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  dmInfo: { flex: 1, overflow: 'hidden' },
  dmName: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.white, marginBottom: 2 },
  dmPreview: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  dmMeta: { alignItems: 'flex-end' },
  dmTime: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body },
  unreadBadge: {
    backgroundColor: Colors.orange,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  unreadBadgeText: { fontSize: 10, fontFamily: Fonts.bodySemiBold, color: '#fff' },
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
  backBtn: { padding: 4 },
  backBtnText: { color: Colors.orange, fontSize: 22, lineHeight: 24 },
  dmConvAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
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
  bubbleMine: { backgroundColor: Colors.orange, borderTopRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopLeftRadius: 4,
  },
  text: { fontSize: 13, color: Colors.white, fontFamily: Fonts.body, lineHeight: 19 },
  textMine: { color: '#fff' },
  time: { fontSize: 10, color: Colors.muted, paddingHorizontal: 4, fontFamily: Fonts.body },
  broadcastWrap: { gap: 4 },
  broadcastLabel: {
    fontSize: 10,
    color: Colors.orange,
    fontFamily: Fonts.bodySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  broadcastBubble: {
    backgroundColor: '#1a0800',
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: 12,
    padding: 14,
  },
  broadcastText: { fontSize: 13, color: Colors.white, fontFamily: Fonts.body, lineHeight: 19 },
});
