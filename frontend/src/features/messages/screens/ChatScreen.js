import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../../core/design/Theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChatScreen({ route, navigation }) {
  const { threadId, name, avatar, otherUid } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (threadId) {
      loadMessages();
      // Poll for new messages every 3 seconds
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [threadId]);

  useEffect(() => {
    if (route.params?.initialMessage) {
        setInput(route.params.initialMessage);
    }
  }, [route.params?.initialMessage]);

  const loadUser = async () => {
    const u = await getCurrentUserId();
    setUid(u);
  };

  const loadMessages = async () => {
    try {
      const res = await client.get(`/messages/thread/${threadId}`);
      if (res.data && res.data.messages) {
        setMessages(res.data.messages);
      }
    } catch (e) {
      console.log("Error fetching messages:", e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !uid || !threadId) return;

    const text = input.trim();
    setInput('');

    // Optimistic Update (Optional, simpler to just refetch)
    // const newMsg = {
    //   id: Date.now().toString(),
    //   text,
    //   senderId: uid,
    //   timestamp: new Date().toISOString(),
    //   type: 'text'
    // };
    // setMessages(prev => [newMsg, ...prev]);

    try {
      await client.post('/messages/send', {
        conversation_id: threadId,
        text: text
      });
      loadMessages(); // Fetch immediately to get server ID and timestamp
    } catch (e) {
      console.error(e);
      alert('Failed to send message');
    }
  };

  const renderItem = ({ item }) => {
    // senderId from backend is user.uid. uid state is also user.uid.
    const isMe = item.senderId === uid;

    return (
      <View style={[styles.msgContainer, isMe ? styles.msgRight : styles.msgLeft]}>
        {!isMe && (
          <Image
            source={{ uri: item.avatar || avatar || 'https://picsum.photos/40/40' }}
            style={styles.avatarSmall}
          />
        )}
        {isMe ? (
          <LinearGradient
            colors={['#4facfe', '#00f2fe']} // Premium Blue Gradient
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleRight]}
          >
            <Text style={[styles.msgText, styles.textRight]}>
              {item.text}
            </Text>
            <Text style={[styles.timeText, styles.timeRight]}>
              {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
            </Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleLeft]}>
            <Text style={[styles.msgText, styles.textLeft]}>
              {item.text}
            </Text>
            <Text style={[styles.timeText, styles.timeLeft]}>
              {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const headerName = name || 'Chat';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Image
          source={{ uri: avatar || 'https://picsum.photos/40/40' }}
          style={styles.headerAvatar}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
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
        keyExtractor={item => item.id.toString()}
        inverted // Show newest at bottom (backend returns desc, reverse ordered)
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
    // backgroundColor: COLORS.primary, // Handled by Gradient
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
