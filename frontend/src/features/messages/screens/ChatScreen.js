import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SectionList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler'; // Ensure wrapper

// Firebase
import { getDb } from '../../../core/firebase/firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit as limitResults, 
  updateDoc 
} from 'firebase/firestore';

// Core
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SPACING, SHADOWS } from '../../../core/design/Theme';
import MessageBubble from '../components/MessageBubble';

export default function ChatScreen({ route, navigation }) {
  // Params
  const { thread, threadId: paramThreadId, name, otherUid, avatar } = route.params || {};

  // State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(false);
  
  // Advanced Features State
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null); // For long press menu
  
  // Refs
  const typingTimeoutRef = useRef(null);
  const insets = useSafeAreaInsets();
  
  // Quick Phrases
  const QUICK_PHRASES = ["Hi! 👋", "Is this available?", "Thanks!", "Can we meet?", "Sounds good."];

  // 1. Init & User
  useEffect(() => {
    const init = async () => {
      try {
        const uid = await getCurrentUserId();
        setCurrentUser(uid);
        
        let calculatedThreadId = paramThreadId || thread?.id;
        if (!calculatedThreadId && otherUid) {
          calculatedThreadId = [uid, otherUid].sort().join('_');
        }
        
        setActiveThreadId(calculatedThreadId);
        
        if (calculatedThreadId) {
          subscribeToMessages(calculatedThreadId);
          subscribeToPresence(calculatedThreadId, uid);
        } else {
          setLoading(false);
        }

      } catch (error) {
        console.error('Chat init error:', error);
        setLoading(false);
      }
    };
    init();
  }, [paramThreadId, thread, otherUid]);

  // 2. Real-time Messages
  const subscribeToMessages = (tid) => {
    const db = getDb();
    const q = query(
      collection(db, 'messages', tid, 'msgs'),
      orderBy('timestamp', 'desc'),
      limitResults(50)
    );

    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
      }));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error('Snapshot error:', error);
      setLoading(false);
    });
  };

  // 3. Presence
  const subscribeToPresence = (tid, myUid) => {
    const db = getDb();
    return onSnapshot(doc(db, 'messages', tid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const typingData = data.typing || {};
        const isOtherTyping = Object.entries(typingData).some(([uid, isTyping]) => {
          return uid !== myUid && isTyping === true;
        });
        setOtherUserTyping(isOtherTyping);
      }
    });
  };

  // 4. Send Message
  const sendMessage = async () => {
    if ((!inputText.trim() && !sending) || !activeThreadId || !currentUser) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);
    setReplyingTo(null);

    try {
      await client.post('/messages/send', {
        from: currentUser,
        to: otherUid,
        threadId: activeThreadId,
        text: textToSend,
        type: 'text',
        replyTo: replyingTo ? {
          id: replyingTo.id,
          text: replyingTo.text ? replyingTo.text.substring(0, 50) : 'Attachment', // Truncate
          sender: replyingTo.from === currentUser ? 'You' : name
        } : null,
      });
    } catch (error) {
      console.error('Send error:', error);
      Alert.alert('Error', 'Failed to send message');
      setInputText(textToSend);
    } finally {
      setSending(false);
      handleTyping(false);
    }
  };

  // 5. Typing Handler
  const handleTyping = (isTypingStatus) => {
    if (!activeThreadId || !currentUser) return;
    const db = getDb();
    updateDoc(doc(db, 'messages', activeThreadId), {
      [`typing.${currentUser}`]: isTypingStatus
    }).catch(e => {});
  };

  const onChangeText = (text) => {
    setInputText(text);
    if (!isTyping) {
      setIsTyping(true);
      handleTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      handleTyping(false);
    }, 2000);
  };

  // 6. Actions
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      Alert.alert('Coming Soon', 'Image uploading will be enabled shortly.');
    }
  };

    // React to Message
  const reactToMessage = async (emoji) => {
    if (!selectedMessage) return;
    try {
      await client.post('/messages/react', {
        threadId: activeThreadId,
        msgId: selectedMessage.id,
        userId: currentUser,
        emoji: emoji
      });
      setSelectedMessage(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Message
  const deleteMessage = async () => {
    if (!selectedMessage) return;
    try {
      await client.post('/messages/delete', {
        threadId: activeThreadId,
        msgId: selectedMessage.id,
        userId: currentUser
      });
      setSelectedMessage(null);
    } catch (e) {
      Alert.alert('Error', 'Could not delete message');
    }
  };


  // Helpers used in render
  const sections = React.useMemo(() => {
    if (!messages.length) return [];
    
    // Group by day
    const grouped = {};
    messages.forEach(msg => {
      const dateKey = new Date(msg.timestamp).toDateString(); // e.g. "Mon Dec 17 2025"
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(msg);
    });

    return Object.keys(grouped).map(dateKey => ({
      title: dateKey,
      data: grouped[dateKey] // messages in that day
    }));
  }, [messages]);


  const renderHeader = () => (
    <View style={styles.header}>
       <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
         <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
       </TouchableOpacity>
       
       <View style={styles.headerInfo}>
         <Text style={styles.headerName}>{name || 'Chat'}</Text>
         {otherUserTyping ? (
           <Text style={styles.headerStatusTyping}>Typing...</Text>
         ) : (
           <Text style={styles.headerStatus}>{onlineStatus ? 'Online' : 'Offline'}</Text>
         )}
       </View>
       
       <View style={styles.headerActions}>
         <TouchableOpacity style={styles.headerActionBtn}>
           <Ionicons name="call-outline" size={22} color={COLORS.primary} />
         </TouchableOpacity>
         <TouchableOpacity style={styles.headerActionBtn}>
           <Ionicons name="videocam-outline" size={22} color={COLORS.primary} />
         </TouchableOpacity>
       </View>
    </View>
  );

  // Swipe Action
  const renderRightActions = (progress, dragX, item) => {
    return (
        <View style={{ width: 80, justifyContent: 'center', alignItems: 'center' }}>
           <Ionicons name="arrow-undo" size={24} color={COLORS.text.tertiary} />
        </View>
    );
  };

  const renderItem = ({ item }) => {
    return (
      <Swipeable
        renderRightActions={(p, d) => renderRightActions(p, d, item)}
        onSwipeableRightOpen={() => setReplyingTo(item)}
      >
        <MessageBubble 
          message={item} 
          isOwnMessage={item.from === currentUser}
          showAvatar={item.from !== currentUser}
          avatar={avatar} 
          senderName={name}
          onPress={() => {}} 
          onLongPress={(msg) => setSelectedMessage(msg)}
        />
      </Swipeable>
    );
  };
  
  const formatDateHeader = (dateString) => {
      const date = new Date(dateString);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) return 'Today';
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <LinearGradient
          colors={['rgba(255,255,255,1)', 'rgba(245,247,250,1)']}
          style={styles.chatBackground}
        >
          {loading ? (
             <View style={styles.center}>
               <ActivityIndicator size="large" color={COLORS.primary} />
             </View>
          ) : messages.length === 0 ? (
                <View style={[styles.emptyContainer, { transform: [{ scaleY: 1 }]}]}> 
                  <Image source={{ uri: avatar || 'https://via.placeholder.com/100' }} style={styles.emptyAvatar} />
                  <Text style={styles.emptyName}>{name}</Text>
                  <Text style={styles.emptyText}>Start the conversation!</Text>
                  <TouchableOpacity style={styles.waveBtn} onPress={() => setInputText('👋')}>
                    <Text style={{fontSize: 24}}>👋</Text>
                  </TouchableOpacity>
                </View>
          ) : (
            <SectionList
              inverted
              sections={sections}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              renderSectionFooter={({ section: { title } }) => ( // Inverted List: Footer is technically header visually
                 <View style={styles.dateSeparator}>
                   <Text style={styles.dateText}>{formatDateHeader(title)}</Text>
                 </View>
              )}
              stickySectionHeadersEnabled={false} // Inverted sticky headers are tricky
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={ // Inverted: Footer is at top
                  <View style={styles.encryptionBadge}>
                      <Ionicons name="lock-closed" size={12} color="#888" />
                      <Text style={styles.encryptionText}>Messages are end-to-end encrypted</Text>
                  </View>
              }
            />
          )}

          {/* Quick Phrases & Reply Preview */}
          <View style={styles.aboveInputContainer}>
             {replyingTo && (
                 <View style={styles.replyPreview}>
                     <View style={styles.replyLine} />
                     <View style={{flex: 1}}>
                         <Text style={styles.replyToName} numberOfLines={1}>Replying to {replyingTo.from === currentUser ? 'Yourself' : name}</Text>
                         <Text style={styles.replyText} numberOfLines={1}>{replyingTo.text}</Text>
                     </View>
                     <TouchableOpacity onPress={() => setReplyingTo(null)}>
                         <Ionicons name="close-circle" size={20} color={COLORS.text.secondary} />
                     </TouchableOpacity>
                 </View>
             )}
             
             {!inputText && !replyingTo && (
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPhrases}>
                     {QUICK_PHRASES.map((phrase, i) => (
                         <TouchableOpacity key={i} style={styles.chip} onPress={() => setInputText(phrase)}>
                             <Text style={styles.chipText}>{phrase}</Text>
                         </TouchableOpacity>
                     ))}
                 </ScrollView>
             )}
          </View>

          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10)}]}>
             <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
               <Ionicons name="add" size={24} color={COLORS.primary} />
             </TouchableOpacity>
             
             <TextInput
               style={styles.input}
               placeholder="Message..."
               value={inputText}
               onChangeText={onChangeText}
               multiline
               maxLength={1000}
             />
             
             {inputText.trim().length > 0 ? (
               <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={sending}>
                 {sending ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="arrow-up" size={20} color="white" />}
               </TouchableOpacity>
             ) : (
               <TouchableOpacity style={styles.micBtn}>
                 <Ionicons name="mic-outline" size={24} color={COLORS.text.secondary} />
               </TouchableOpacity>
             )}
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>

      {/* Message Menu Modal */}
      <Modal visible={!!selectedMessage} transparent animationType="fade">
         <TouchableOpacity 
             style={styles.modalOverlay} 
             activeOpacity={1} 
             onPress={() => setSelectedMessage(null)}
         >
             <View style={styles.menuContainer}>
                 {/* Reaction Strip */}
                 <View style={styles.reactionStrip}>
                     {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                         <TouchableOpacity key={emoji} onPress={() => reactToMessage(emoji)}>
                             <Text style={{fontSize: 24}}>{emoji}</Text>
                         </TouchableOpacity>
                     ))}
                 </View>
                 
                 {/* Actions */}
                 <View style={styles.menuActions}>
                     <TouchableOpacity style={styles.menuItem} onPress={() => { setReplyingTo(selectedMessage); setSelectedMessage(null); }}>
                         <Text style={styles.menuText}>Reply</Text>
                         <Ionicons name="arrow-undo-outline" size={20} />
                     </TouchableOpacity>
                     
                     <TouchableOpacity style={styles.menuItem} onPress={() => { setSelectedMessage(null); /* Copy */ }}>
                         <Text style={styles.menuText}>Copy Text</Text>
                         <Ionicons name="copy-outline" size={20} />
                     </TouchableOpacity>

                     {selectedMessage?.from === currentUser && (
                         <TouchableOpacity style={styles.menuItem} onPress={deleteMessage}>
                             <Text style={[styles.menuText, {color: COLORS.error}]}>Unsend</Text>
                             <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                         </TouchableOpacity>
                     )}
                 </View>
             </View>
         </TouchableOpacity>
      </Modal>

    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    zIndex: 10,
    ...SHADOWS.light,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },
  headerStatus: { fontSize: 12, color: COLORS.text.tertiary },
  headerStatusTyping: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 16 },
  headerActionBtn: { padding: 4 },
  
  // Chat Area
  chatBackground: { flex: 1 },
  listContent: { paddingVertical: 16, paddingHorizontal: 0 },
  dateSeparator: { alignSelf: 'center', marginVertical: 16, backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, transform: [{ scaleY: -1 }] }, // Reverse visual for inverted list
  dateText: { fontSize: 11, color: COLORS.text.secondary, fontWeight: '600' },
  encryptionBadge: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, transform: [{ scaleY: -1 }] },
  encryptionText: { fontSize: 10, color: '#888', marginLeft: 4 },

  // Input Area
  aboveInputContainer: { backgroundColor: '#fff' },
  quickPhrases: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4, maxHeight: 44 },
  chip: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  chipText: { fontSize: 13, color: '#333' },
  replyPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  replyLine: { width: 4, height: '100%', backgroundColor: COLORS.primary, borderRadius: 2, marginRight: 8 },
  replyToName: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
  replyText: { fontSize: 12, color: '#666' },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  attachBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', marginBottom: 4, marginRight: 8 },
  input: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100, minHeight: 40, marginBottom: 4, marginRight: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4, ...SHADOWS.small },
  micBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  
  // Empty State
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 16, backgroundColor: '#eee' },
  emptyName: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.text.secondary, marginBottom: 24 },
  waveBtn: { fontSize: 40, padding: 20, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 50 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { width: '80%', backgroundColor: '#fff', borderRadius: 16, padding: 16, ...SHADOWS.medium },
  reactionStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuActions: {},
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  menuText: { fontSize: 16, color: COLORS.text.primary },
});
