import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../../core/design/Theme';
import { getDb } from '../../../core/firebase/firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, updateDoc, query, orderBy } from 'firebase/firestore';

export default function ChatScreen({ route, navigation }) {
  const { thread, threadId, name, avatar, otherUid } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [uid, setUid] = useState(null);
  const flatListRef = useRef();

  // Determine effective Thread ID
  // If passed directly, use it. If passing user objects, construct it (if 1-on-1).
  // Ideally, backend or previous screen solves this, but we handle fallback.
  const effectiveThreadId = thread?.id || threadId; 
  // If we don't have a threadID yet (e.g. from NewMessage 1-on-1 start where we computed it), we use that.

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const u = await getCurrentUserId();
    setUid(u);
  };

  useEffect(() => {
    if (!effectiveThreadId) return;

    const db = getDb();
    const q = query(
      collection(db, 'messages', effectiveThreadId, 'chat'), 
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return unsubscribe;
  }, [effectiveThreadId]);

  const sendMessage = async () => {
    if (!input.trim() || !uid || !effectiveThreadId) return;

    const text = input.trim();
    setInput('');

    try {
      const db = getDb();
      // Add message
      await addDoc(collection(db, 'messages', effectiveThreadId, 'chat'), {
        text,
        senderId: uid,
        timestamp: serverTimestamp(),
        type: 'text'
      });

      // Update thread last message
      await updateDoc(doc(db, 'messages', effectiveThreadId), {
        lastMessage: {
          text,
          timestamp: new Date(), // Client side est, server timestamp better but this is quick update
          senderId: uid
        },
        updatedAt: serverTimestamp()
      });

    } catch (e) {
      console.error(e);
      alert('Failed to send message');
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === uid;
    return (
      <View style={[styles.msgContainer, isMe ? styles.msgRight : styles.msgLeft]}>
        {!isMe && (
           <Image
             source={{ uri: avatar || 'https://picsum.photos/40/40' }}
             style={styles.avatarSmall}
           />
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
          <Text style={[styles.msgText, isMe ? styles.textRight : styles.textLeft]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.timeRight : styles.timeLeft]}>
              {item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
          </Text>
        </View>
      </View>
    );
  };

  const headerName = thread?.name || name || 'Chat';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Image 
            source={{ uri: thread?.avatar || avatar || 'https://picsum.photos/40/40' }} 
            style={styles.headerAvatar} 
        />
        <View style={{flex: 1, marginLeft: 10}}>
            <Text style={styles.headerTitle} numberOfLines={1}>{headerName}</Text>
        </View>
        <TouchableOpacity style={{ padding: 8 }}>
            <Ionicons name="ellipsis-vertical" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        inverted // Show newest at bottom (standard chat UI)
        contentContainerStyle={{ padding: SPACING.m }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn}>
              <Ionicons name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={!input.trim()}>
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.s,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: Platform.OS === 'android' ? 40 : SPACING.s,
  },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
  
  msgContainer: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRight: { justifyContent: 'flex-end' },
  msgLeft: { justifyContent: 'flex-start' },
  
  avatarSmall: { width: 32, height: 32, borderRadius: 16, marginRight: 8, marginBottom: 4 },
  
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  bubbleLeft: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    ...SHADOWS.light,
  },
  bubbleRight: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
    ...SHADOWS.light,
  },
  
  msgText: { fontSize: 16 },
  textLeft: { color: COLORS.text.primary },
  textRight: { color: 'white' },

  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timeLeft: { color: '#888' },
  timeRight: { color: 'rgba(255,255,255,0.7)' },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  attachBtn: { padding: 8 },
  input: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    marginHorizontal: 8,
    fontSize: 16,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
