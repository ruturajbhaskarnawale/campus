import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../core/api/client';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../../../core/design/Theme';
import { getCurrentUserId } from '../../../core/auth';

export default function ChatScreen({ route, navigation }) {
    const { thread } = route.params || {};
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState(null);
    const flatListRef = useRef();

    useEffect(() => {
        async function init() {
            const uid = await getCurrentUserId();
            setUserId(uid);
        }
        init();
        if (thread?.name) {
             navigation.setOptions({ title: thread.name });
        }
    }, [thread]);

    useEffect(() => {
        if (thread?.id) {
            fetchMessages();
        }
    }, [thread]);

    const fetchMessages = async () => {
        setLoading(true);
        try {
             // TODO: Integrate actual backend
             // const res = await client.get(`/messages/${thread.id}`); 
             setMessages([
                 { id: '1', text: 'Hey there!', senderId: 'other', timestamp: Date.now() - 10000 },
                 { id: '2', text: 'Hello! How are you?', senderId: userId || 'me', timestamp: Date.now() - 5000 },
             ]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!text.trim()) return;
        const tempId = Date.now().toString();
        const newMsg = { id: tempId, text: text, senderId: userId || 'me', timestamp: Date.now() };
        setMessages(prev => [newMsg, ...prev]);
        setText('');
        // TODO: Backend call
    };

    const renderItem = ({ item }) => {
        const isMe = item.senderId === userId || item.senderId === 'me';
        return (
            <View style={[styles.bubbleWrapper, isMe ? styles.meWrapper : styles.otherWrapper]}>
                <View style={[styles.bubble, isMe ? styles.meBubble : styles.otherBubble]}>
                    <Text style={[styles.msgText, isMe ? styles.meText : styles.otherText]}>{item.text}</Text>
                </View>
                <Text style={styles.time}>{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={i => i.id}
                renderItem={renderItem}
                inverted
                contentContainerStyle={{ padding: SPACING.m }}
            />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={text}
                        onChangeText={setText}
                        placeholder="Type a message..."
                        placeholderTextColor="#999"
                    />
                    <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                        <Ionicons name="send" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background.light },
    bubbleWrapper: { marginBottom: 10, maxWidth: '80%' },
    meWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    otherWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    bubble: { padding: 12, borderRadius: 16 },
    meBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 2 },
    otherBubble: { backgroundColor: 'white', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#eee' },
    msgText: { fontSize: 16 },
    meText: { color: 'white' },
    otherText: { color: COLORS.text.primary },
    time: { fontSize: 10, color: '#999', marginTop: 4, marginHorizontal: 4 },
    inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, fontSize: 16 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }
});
