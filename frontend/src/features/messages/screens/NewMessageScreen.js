import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SPACING, SHADOWS } from '../../../core/design/Theme';

// Firebase for Group Creation
import { getDb } from '../../../core/firebase/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function NewMessageScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUid, setCurrentUid] = useState(null);
  
  // Group Chat State
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]); // List of user objects
  const [groupName, setGroupName] = useState('');

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
      const res = await client.get('/search/unified', { params: { type: 'users', limit: 20 } });
      if (res.data && res.data.users) {
         setUsers(res.data.users.filter(u => u.uid !== uid && u.id !== uid));
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
        setUsers(res.data.users.filter(u => u.uid !== currentUid && u.id !== currentUid));
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    if (isGroupMode) {
        // Toggle selection
        const exists = selectedUsers.find(u => (u.uid || u.id) === (user.uid || user.id));
        if (exists) {
            setSelectedUsers(selectedUsers.filter(u => (u.uid || u.id) !== (user.uid || user.id)));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    } else {
        // Direct Navigation (1-on-1)
        const targetId = user.uid || user.id;
        if (!currentUid || !targetId) return;

        const threadId = [currentUid, targetId].sort().join('_');
        
        navigation.replace('Chat', {
           threadId: threadId,
           name: user.name,
           avatar: user.avatar,
           otherUid: targetId
        });
    }
  };

  const createGroup = async () => {
      if (!groupName.trim()) {
          Alert.alert('Group Name Required');
          return;
      }
      if (selectedUsers.length < 2) {
          Alert.alert('Select at least 2 people');
          return;
      }

      try {
          const db = getDb();
          const groupId = `group_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const participantIds = [currentUid, ...selectedUsers.map(u => u.uid || u.id)];

          await setDoc(doc(db, 'messages', groupId), {
              groupName: groupName.trim(),
              participants: participantIds,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              isGroup: true,
              groupIcon: 'https://picsum.photos/100/100', // Default
              lastMessage: {
                  text: 'Group created',
                  timestamp: new Date(),
                  type: 'system'
              }
          });

          navigation.replace('Chat', {
              threadId: groupId,
              name: groupName,
              avatar: 'https://picsum.photos/100/100' // pass group icon
          });

      } catch (e) {
          Alert.alert('Error creating group', e.message);
      }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedUsers.some(u => (u.uid || u.id) === (item.uid || item.id));
    return (
        <TouchableOpacity style={[styles.userItem, isSelected && styles.userItemSelected]} onPress={() => handleSelectUser(item)}>
        <Image 
            source={{ uri: item.avatar || 'https://picsum.photos/60/60' }} 
            style={styles.avatar} 
        />
        <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userHandle}>@{item.username || item.name?.split(' ')[0]?.toLowerCase()}</Text>
        </View>
        {isGroupMode ? (
            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? COLORS.primary : COLORS.text.tertiary} />
        ) : (
            <Ionicons name="chatbubble-outline" size={24} color={COLORS.text.tertiary} />
        )}
        </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
           <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isGroupMode ? 'New Group' : 'New Message'}</Text>
        <TouchableOpacity onPress={() => { setIsGroupMode(!isGroupMode); setSelectedUsers([]); setGroupName(''); }}>
            <Text style={styles.headerAction}>{isGroupMode ? 'Cancel' : 'Create Group'}</Text>
        </TouchableOpacity>
      </View>

      {/* Group Name Input */}
      {isGroupMode && (
          <View style={styles.groupInputContainer}>
              <View style={styles.groupIconPlaceholder}>
                  <Ionicons name="people" size={24} color="#fff" />
              </View>
              <TextInput 
                  style={styles.groupNameInput}
                  placeholder="Group Name"
                  value={groupName}
                  onChangeText={setGroupName}
              />
          </View>
      )}

      {/* Search */}
      <View style={styles.toContainer}>
        <Text style={styles.toLabel}>To:</Text>
        {isGroupMode && selectedUsers.length > 0 ? (
            <View style={{flex: 1, flexDirection: 'row', flexWrap: 'wrap'}}>
                {selectedUsers.map(u => (
                    <View key={u.id || u.uid} style={styles.selectedChip}>
                        <Text style={styles.selectedChipText}>{u.name}</Text>
                    </View>
                ))}
            </View>
        ) : (
            <TextInput 
            style={styles.searchInput}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            />
        )}
      </View>

      <Text style={styles.sectionTitle}>Suggested</Text>
      
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.uid || item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {isGroupMode && selectedUsers.length > 0 && (
          <View style={styles.footer}>
              <TouchableOpacity style={styles.createBtn} onPress={createGroup}>
                  <Text style={styles.createBtnText}>Create Group ({selectedUsers.length})</Text>
              </TouchableOpacity>
          </View>
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
  headerAction: {
      color: COLORS.primary,
      fontWeight: '600',
  },
  groupInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
  },
  groupIconPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
  },
  groupNameInput: {
      flex: 1,
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
    minHeight: 50,
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
  selectedChip: {
      backgroundColor: '#f0f0f0',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginRight: 4,
      marginBottom: 4,
  },
  selectedChipText: { fontSize: 12 },
  sectionTitle: {
    padding: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  listContent: {
    paddingBottom: 80,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userItemSelected: {
      backgroundColor: '#f9f9f9',
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
  footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
  },
  createBtn: {
      backgroundColor: COLORS.primary,
      paddingVertical: 12,
      borderRadius: 25,
      alignItems: 'center',
  },
  createBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
  },
});
