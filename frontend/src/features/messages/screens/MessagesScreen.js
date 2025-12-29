import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../../../core/design/Theme';

export default function MessagesScreen({ navigation }) {
  const [threads, setThreads] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    init();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  const init = async () => {
    try {
      const uid = await getCurrentUserId();
      setCurrentUserId(uid);
      await loadThreads(uid);
    } catch (error) {
      console.error('Init error:', error);
      setLoading(false);
    }
  };

  const loadThreads = async (uid) => {
    try {
      setLoading(true);
      const response = await client.get('/messages/threads', {
        params: { uid }
      });
      
      const threadsData = response.data.threads || [];
      setThreads(threadsData);
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Load threads error:', error);
      Alert.alert('Error', 'Unable to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadThreads(currentUserId);
  }, [currentUserId]);

  // ... (Keep existing formatTimestamp and getFilteredThreads)

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      if ((now - date) < 60000) return 'Just now';
      return date.toLocaleDateString();
    } catch { return ''; }
  };

  const getFilteredThreads = () => {
    if (!searchQuery) return threads;
    const query = searchQuery.toLowerCase();
    return threads.filter(thread => 
      thread.name.toLowerCase().includes(query) ||
      thread.lastMessage?.text?.toLowerCase().includes(query)
    );
  };

  const renderHeader = () => (
    <View style={{ backgroundColor: '#fff', paddingBottom: 8 }}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity onPress={() => navigation.navigate('NewMessage')}>
             <Ionicons name="create-outline" size={28} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#8e8e8e" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8e8e8e"
          />
        </View>
      </View>
    </View>
  );

  // Render Active Users (Instagram Style Stories)
  const renderActiveUsers = () => {
    // Mock active users based on threads or separate data
    const activeUsers = threads.filter(t => t.online || Math.random() > 0.7).slice(0, 10);
    
    if (activeUsers.length === 0) return null;

    return (
      <View style={styles.activeUsersContainer}>
        <Text style={styles.sectionTitle}>Active Now</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeUsersList}>
          {activeUsers.map((user, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.activeUserItem}
              onPress={() => navigation.navigate('Chat', { ...user })}
            >
              <View style={styles.activeUserAvatarContainer}>
                <Image source={{ uri: user.avatar || 'https://picsum.photos/60/60' }} style={styles.activeUserAvatar} />
                <View style={styles.activeUserDot} />
              </View>
              <Text style={styles.activeUserName} numberOfLines={1}>{user.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSuggestions = () => {
      if (!suggestions || suggestions.length === 0) {
          // Fallback to basic empty state if no suggestions
         return (
             <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#ddd" />
                <Text style={[styles.emptyTitle, {marginTop: 20, color: '#444'}]}>No messages yet</Text>
                <Text style={{color: '#888', marginTop: 8}}>Start connecting with other students!</Text>
                <TouchableOpacity 
                   style={{marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20}}
                   onPress={() => navigation.navigate('Search')}
                >
                    <Text style={{color: '#fff', fontWeight: '600'}}>Find People</Text>
                </TouchableOpacity>
             </View>
         );
      }

      return (
         <ScrollView style={{flex: 1, padding: 16}}>
             <View style={{alignItems: 'center', marginBottom: 20, marginTop: 20}}>
                <Text style={{fontSize: 22, fontWeight: 'bold', color: '#262626'}}>Suggested for you</Text>
                <Text style={{color: '#888'}}>Start a conversation with these people</Text>
             </View>
             
             {suggestions.map((u, i) => (
                <TouchableOpacity 
                   key={i} 
                   style={[styles.threadItem, {backgroundColor: '#f9f9f9', borderRadius: 12, marginBottom: 10}]} 
                   onPress={() => {
                       // Navigate to Chat with this user
                       // We need to pass params that ChatScreen expects
                       navigation.navigate('Chat', { 
                           userId: u.uid, 
                           name: u.name, 
                           avatar: u.avatar 
                       });
                   }}
                >
                   <Image source={{uri: u.avatar}} style={styles.avatar} />
                   <View style={{marginLeft: 12, flex: 1}}>
                      <Text style={{fontSize: 16, fontWeight: '600', color: '#262626'}}>{u.name}</Text>
                      <Text style={{color: '#666', fontSize: 13}}>{u.role || 'Student'}</Text>
                      <Text style={{color: '#888', fontSize: 12}} numberOfLines={1}>{u.bio}</Text>
                   </View>
                   <View style={{backgroundColor: COLORS.primary + '15', padding: 8, borderRadius: 20}}>
                      <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
                   </View>
                </TouchableOpacity>
             ))}
         </ScrollView>
      )
  };

  const renderThreadCard = ({ item }) => {
    const isUnread = item.unreadCount > 0;
    
    return (
      <TouchableOpacity
        style={styles.threadItem}
        onPress={() => navigation.navigate('Chat', {
          threadId: item.id,
          name: item.name,
          avatar: item.avatar,
          otherUid: item.otherUid
        })}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: item.avatar || 'https://picsum.photos/60/60' }}
            style={styles.avatar} // Circle
          />
          {item.online && <View style={styles.onlineDot} />}
        </View>
        
        <View style={styles.threadContent}>
          <View style={styles.threadTopRow}>
            <Text style={[styles.threadName, isUnread && styles.threadNameUnread]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(item.lastMessage?.timestamp)}
            </Text>
          </View>
          
          <View style={styles.threadBottomRow}>
            <Text 
              style={[styles.lastMessage, isUnread ? styles.lastMessageUnread : styles.lastMessageRead]} 
              numberOfLines={1}
            >
              {item.lastMessage?.text || 'Sent an attachment'}
            </Text>
            
            {isUnread && (
              <View style={styles.unreadDot} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      
      {threads.length === 0 && !loading ? (
        renderSuggestions()
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          renderItem={renderThreadCard}
          ListHeaderComponent={renderActiveUsers}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  
  // Search
  searchContainer: {
    paddingVertical: 0,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#000',
  },
  
  // Active Users
  activeUsersContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
  },
  activeUsersList: {
    paddingLeft: 16,
  },
  activeUserItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 64,
  },
  activeUserAvatarContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  activeUserAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.success, // Green ring for active
  },
  activeUserDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: '#fff',
  },
  activeUserName: {
    fontSize: 12,
    color: '#262626',
  },
  
  // Thread List (Flat)
  listContent: {
    paddingBottom: 20,
  },
  threadItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eee',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: '#fff',
  },
  threadContent: {
    flex: 1,
    justifyContent: 'center',
  },
  threadTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  threadBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threadName: {
    fontSize: 16,
    fontWeight: '400', // Instagram uses regular for read
    color: '#262626',
  },
  threadNameUnread: {
    fontWeight: '700', // Bold for unread
  },
  timestamp: {
    fontSize: 12,
    color: '#8e8e8e',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    marginRight: 10,
  },
  lastMessageRead: {
    color: '#8e8e8e',
  },
  lastMessageUnread: {
    color: '#262626',
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary, // Blue dot
  },
  
  // Loading & Empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#888' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold' },
});
