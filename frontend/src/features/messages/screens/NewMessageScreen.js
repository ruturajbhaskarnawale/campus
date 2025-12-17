import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SPACING, FONTS } from '../../../core/design/Theme';

export default function NewMessageScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUid, setCurrentUid] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      searchUsers();
    } else {
      loadInitialData();
    }
  }, [searchQuery]);

  const loadInitialData = async () => {
    try {
      const uid = await getCurrentUserId();
      setCurrentUid(uid);
      setLoading(true);
      // Fetch suggestions or recent users. Using unified search with empty query for suggestions if backend supports
      // Or just a sample of users
      const res = await client.get('/search/unified', { params: { type: 'users', limit: 20 } });
      if (res.data && res.data.users) {
         setUsers(res.data.users.filter(u => u.id !== uid));
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      setLoading(true);
      const res = await client.get('/search/unified', { params: { q: searchQuery, type: 'users' } });
      if (res.data && res.data.users) {
        setUsers(res.data.users.filter(u => u.id !== currentUid));
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    // Navigate to Chat. ChatScreen will handle constructing the thread details.
    // However, ChatScreen usually expects a threadId.
    // If we simply pass user details, we rely on ChatScreen or backend to find the thread.
    // Let's pass the otherUid and let ChatScreen resolve it?
    // Looking at ChatScreen (previous turn), it expects `threadId`.
    // We should compute it or find it.
    // Standard logic: threadId = sort(uid1, uid2).join('_');
    
    if (!currentUid || !user.id) return;

    const threadId = [currentUid, user.id].sort().join('_');
    
    navigation.replace('Chat', {
       threadId: threadId,
       name: user.name,
       avatar: user.avatar,
       otherUid: user.id
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => handleSelectUser(item)}>
      <Image 
        source={{ uri: item.avatar || 'https://via.placeholder.com/60' }} 
        style={styles.avatar} 
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userHandle}>@{item.username || item.name.split(' ')[0].toLowerCase()}</Text>
      </View>
      <Ionicons name="camera-outline" size={24} color={COLORS.text.tertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
           <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New message</Text>
        <View style={{ width: 24 }} /> 
      </View>

      {/* Search */}
      <View style={styles.toContainer}>
        <Text style={styles.toLabel}>To:</Text>
        <TextInput 
          style={styles.searchInput}
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      </View>

      <Text style={styles.sectionTitle}>Suggested</Text>
      
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  toContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  sectionTitle: {
    padding: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  listContent: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  userHandle: {
    fontSize: 13,
    color: '#8e8e8e',
  },
});
