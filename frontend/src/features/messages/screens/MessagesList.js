import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, SafeAreaView, Platform, RefreshControl, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../core/api/client';
import { COLORS, SHADOWS, SPACING, RADIUS, FONTS } from '../../../core/design/Theme';
import { getCurrentUserId } from '../../../core/auth';
import { FeedSkeleton } from '../../../core/widgets/SkeletonLoader';

export default function MessagesList({ navigation }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');

  const fetchThreads = useCallback(async () => {
    try {
      const uid = await getCurrentUserId();
      if (!uid) return;
      const res = await client.get(`/messages/threads?uid=${uid}`);
      // Guard against non-array response
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setThreads(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error(e);
      // Fallback for safety
      setThreads([]);
    } finally { 
      setLoading(false); 
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchThreads();
  };

  const filteredThreads = threads.filter(t => 
    (t.name || t.id).toLowerCase().includes(q.toLowerCase()) || 
    (t.last || '').toLowerCase().includes(q.toLowerCase())
  );

  const formatTime = (iso) => {
      if (!iso) return '';
      const date = new Date(iso);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Chat', { thread: item })}
    >
      <View style={styles.avatar}>
         <Text style={styles.avatarText}>{(item.name || 'U')[0].toUpperCase()}</Text>
         {/* Online dot simulation */}
         <View style={styles.onlineDot} />
      </View>
      <View style={{flex: 1, justifyContent: 'center'}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
           <Text style={styles.name} numberOfLines={1}>{item.name || item.id}</Text>
           <Text style={styles.time}>{formatTime(item.lastTimestamp)}</Text>
        </View>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text numberOfLines={1} style={[styles.lastMsg, item.unread > 0 && styles.lastMsgUnread]}>
                {item.last || 'Start a conversation'}
            </Text>
            {item.unread > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread}</Text>
                </View>
            )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
      return (
          <SafeAreaView style={styles.container}>
              <View style={styles.header}>
                 <Text style={styles.title}>Messages</Text>
              </View>
              <FeedSkeleton />
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.newChatBtn} onPress={() => navigation.navigate('NewMessage')}>
             <Ionicons name="create-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
         <Ionicons name="search" size={20} color={COLORS.text.tertiary} />
         <TextInput 
           style={styles.searchInput} 
           placeholder="Search chats..." 
           value={q} 
           onChangeText={setQ} 
           placeholderTextColor={COLORS.text.tertiary}
         />
      </View>

      <FlatList 
        data={filteredThreads} 
        keyExtractor={(i)=>i.id} 
        renderItem={renderItem} 
        contentContainerStyle={{ padding: SPACING.m }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={80} color={COLORS.border} />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubText}>Start connecting with other students!</Text>
                <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('Search')}>
                    <Text style={{color: 'white', fontWeight: 'bold'}}>Find People</Text>
                </TouchableOpacity>
            </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.primary },
  header: {
    padding: SPACING.m,
    paddingTop: Platform.OS === 'android' ? 40 : SPACING.m,
    backgroundColor: COLORS.background.secondary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.light,
    zIndex: 10,
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text.primary, letterSpacing: -0.5 },
  newChatBtn: {
      padding: 8,
      backgroundColor: COLORS.background.tertiary,
      borderRadius: RADIUS.round,
  },
  searchContainer: {
    margin: SPACING.m,
    padding: 12,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: RADIUS.l,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: COLORS.text.primary, outlineStyle: 'none' },
  card: {
    flexDirection: 'row',
    padding: SPACING.m,
    backgroundColor: COLORS.background.card,
    borderRadius: RADIUS.m,
    marginBottom: SPACING.s,
    ...SHADOWS.light,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatar: {
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: COLORS.primaryGradient[0], 
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 22 },
  onlineDot: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: COLORS.success,
      borderWidth: 2,
      borderColor: COLORS.background.card,
  },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },
  lastMsg: { color: COLORS.text.secondary, fontSize: 14, width: '85%' },
  lastMsgUnread: { color: COLORS.text.primary, fontWeight: '600' },
  time: { fontSize: 12, color: COLORS.text.tertiary },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100, opacity: 0.8 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary, marginTop: 20 },
  emptySubText: { fontSize: 14, color: COLORS.text.secondary, marginTop: 8, marginBottom: 24 },
  startBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: RADIUS.round, ...SHADOWS.medium },
});
