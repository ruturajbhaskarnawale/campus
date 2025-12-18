import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  SectionList, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl, 
  SafeAreaView, 
  Platform, 
  Image, 
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SHADOWS, SPACING, RADIUS, FONTS } from '../../../core/design/Theme';

// Enhanced Mock Data covering all scenarios
const MOCK_ENHANCED_NOTIFS = [
  // New
  { id: 'm1', type: 'job_offer', title: 'Job Offer', body: 'Google sent you a job offer for Senior Developer', timestamp: 'Just now', read: false, priority: 'high', avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png' },
  { id: 'm2', type: 'group_like', title: 'Viral Post', body: 'Alice, Bob, and 100 others liked your post "AI Future"', timestamp: '2m ago', read: false, image: 'https://placehold.co/150', count: 102 },
  { id: 'm3', type: 'join_request', title: 'Connection Request', body: 'Sarah Lee wants to connect', timestamp: '10m ago', read: false, user: 'Sarah Lee', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  
  // Earlier Today
  { id: 'm4', type: 'mention', title: 'Mentioned you', body: 'Mike: @me can you review this PR?', timestamp: '2h ago', read: true, context: 'Team Alpha Chat', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 'm5', type: 'system_alert', title: 'Maintenance', body: 'System maintenance scheduled for 2 AM', timestamp: '4h ago', read: true, pinned: true },
  
  // This Week
  { id: 'm6', type: 'birthday', title: 'Birthday', body: 'Say Happy Birthday to Alice!', timestamp: 'Yesterday', read: true, user: 'Alice', avatar: 'https://randomuser.me/api/portraits/women/12.jpg' },
  { id: 'm7', type: 'deadline', title: 'Project Deadline', body: 'CampusHub submission is due tomorrow', timestamp: '2 days ago', read: true, priority: 'high' },
  { id: 'm8', type: 'digest', title: 'Weekly Digest', body: 'Top projects you missed this week', timestamp: '3 days ago', read: true, isDigest: true },
];

export default function NotificationsScreen({ navigation }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('All'); 
  const [uid, setUid] = useState(null);

  useEffect(() => {
    getCurrentUserId().then(id => {
        setUid(id);
        if(id) fetchNotifications(id);
    });
  }, []);

  const fetchNotifications = async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await client.get(`/notifications/list/${userId}`);
      const real = res.data || [];
      const combined = [...MOCK_ENHANCED_NOTIFS, ...real];
      processData(combined, filter);
    } catch (e) { 
      console.error('fetch notifications', e); 
      processData(MOCK_ENHANCED_NOTIFS, filter);
    }
    finally { setLoading(false); }
  };

  const processData = (data, activeFilter) => {
    // 1. Filter
    const filtered = data.filter(i => {
        if (activeFilter === 'All') return true;
        if (activeFilter === 'Mentions') return i.type === 'mention' || i.title.includes('@');
        if (activeFilter === 'Requests') return i.type === 'join_request' || i.type === 'connect_request';
        return true;
    });

    // 2. Group by Time (Simple logic)
    const newItems = [];
    const earlierItems = [];
    const weekItems = [];

    filtered.forEach(item => {
        const t = item.timestamp.toLowerCase();
        if (t.includes('now') || t.includes('m ago') || t.includes('h ago')) {
            newItems.push(item);
        } else if (t.includes('yesterday') || t.includes('day')) {
            earlierItems.push(item);
        } else {
            weekItems.push(item);
        }
    });

    const sectionsData = [];
    if (newItems.length) sectionsData.push({ title: 'New', data: newItems });
    if (earlierItems.length) sectionsData.push({ title: 'Earlier', data: earlierItems });
    if (weekItems.length) sectionsData.push({ title: 'This Week', data: weekItems });

    setSections(sectionsData);
  };

  useEffect(() => {
     // Re-process if filter changes (needs data persistence, for now re-fetch mock)
     // Ideally we store 'rawItems' state.
     // For simplicity of this step, re-fetching/using mock directly
     processData(MOCK_ENHANCED_NOTIFS, filter);
  }, [filter]);

  const markAllRead = async () => {
      try {
          await client.post('/notifications/mark_all_read', { uid });
          Alert.alert('Success', 'All notifications marked as read');
          // Update local state visuals
          const updated = sections.map(sec => ({
              ...sec,
              data: sec.data.map(item => ({ ...item, read: true }))
          }));
          setSections(updated);
      } catch (e) {
          console.error(e);
      }
  };

  const handlePress = (item) => {
      // Optimistic update
      if (!item.read) {
          // Update generic sections state
          const newSections = sections.map(sec => ({
              ...sec,
              data: sec.data.map(i => i.id === item.id ? { ...i, read: true } : i)
          }));
          setSections(newSections);

          if (uid) {
              // Fire and forget, suppress error if mock id
              client.post('/notifications/mark_read', { uid, nid: item.id }).catch(() => {});
          }
      }
      
      // Navigate based on type
      if (item.type === 'mention') {
          // Nav to chat or post
      } else if (item.type === 'join_request') {
          // Nav to User Profile
      }
  };

  const deleteItem = (itemId) => {
      // Update state to remove item
      const newSections = sections.map(sec => ({
          ...sec,
          data: sec.data.filter(i => i.id !== itemId)
      })).filter(sec => sec.data.length > 0);
      setSections(newSections);
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderRightActions = (progress, dragX, itemId) => {
      const trans = dragX.interpolate({
          inputRange: [-100, 0],
          outputRange: [0, 100],
          extrapolate: 'clamp',
      });
      return (
          <TouchableOpacity onPress={() => deleteItem(itemId)} style={styles.deleteAction}>
             <Ionicons name="trash-outline" size={24} color="#fff" />
          </TouchableOpacity>
      );
  };

  const NotificationCard = ({ item }) => {
    const isUnread = !item.read;
    const isHighPriority = item.priority === 'high';

    return (
      <Swipeable renderRightActions={(p, d) => renderRightActions(p, d, item.id)}>
      <TouchableOpacity 
        style={[
            styles.item, 
            isUnread && styles.unreadItem,
            isHighPriority && styles.highPriorityItem
        ]}
        onPress={() => handlePress(item)}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        <View style={styles.leftContainer}>
             {item.avatar ? (
                 <Image source={{ uri: item.avatar }} style={styles.avatar} />
             ) : (
                 <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.type) + '20' }]}>
                    <Ionicons name={getIcon(item.type)} size={20} color={getIconColor(item.type)} />
                 </View>
             )}
             {/* Badge Icon Overlay */}
             {item.avatar && (
                 <View style={styles.miniIconBadge}>
                      <Ionicons name={getIcon(item.type)} size={10} color="#fff" />
                 </View>
             )}
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
                 <Text style={[styles.itemTitle, isUnread && styles.bold]} numberOfLines={2}>
                     {item.title}
                 </Text>
                 <Text style={styles.time}>{item.timestamp}</Text>
            </View>
            
            <Text style={styles.itemBody} numberOfLines={3}>
                {item.body}
            </Text>

            {/* Rich Content: Post Image */}
            {item.image && (
                <Image source={{ uri: item.image }} style={styles.postThumbnail} />
            )}

            {/* Actions (Join Request) */}
            {item.type === 'join_request' && (
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => alert('Accepted')}>
                        <Text style={styles.acceptText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={() => alert('Declined')}>
                        <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
        
        {/* Unread Dot */}
        {isUnread && <View style={styles.dot} />}
      </TouchableOpacity>
      </Swipeable>
    );
  };

  const getIcon = (t) => {
      if (t === 'group_like') return 'heart';
      if (t === 'job_offer') return 'briefcase';
      if (t === 'deadline') return 'alarm';
      if (t === 'birthday') return 'gift';
      if (t === 'system_alert') return 'warning';
      if (t === 'join_request') return 'person-add';
      return 'notifications';
  };
  const getIconColor = (t) => {
      if (t === 'group_like') return '#e91e63';
      if (t === 'job_offer') return '#ff9800'; // Gold/Orange
      if (t === 'deadline') return '#f44336';
      if (t === 'birthday') return '#9c27b0';
      if (t === 'system_alert') return '#607d8b';
      return COLORS.primary;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <View style={{flexDirection: 'row', gap: 16}}>
            <TouchableOpacity onPress={markAllRead}>
                 <Ionicons name="checkmark-done-circle-outline" size={26} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => alert('Settings')}>
                 <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.filterRow}>
        {['All', 'Mentions', 'Requests'].map(f => (
            <TouchableOpacity 
                key={f} 
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
            >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id + index}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchNotifications(uid)} />}
        renderItem={({ item }) => <NotificationCard item={item} />}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={{ paddingBottom: 100 }}
        stickySectionHeadersEnabled={false}
        ListFooterComponent={
            <View style={styles.footer}>
                <TouchableOpacity onPress={() => alert('Manage Push Settings')}>
                    <Text style={styles.footerLink}>Manage settings</Text>
                </TouchableOpacity>
                <Text style={styles.footerText}>That's all for now!</Text>
            </View>
        }
        ListEmptyComponent={
            <View style={styles.empty}>
                <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>All caught up!</Text>
            </View>
        }
      />
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1, backgroundColor: '#f8f9fa'},
  header: {
    padding: SPACING.m,
    paddingTop: Platform.OS === 'android' ? 40 : SPACING.m,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title:{fontSize:24, fontWeight:'bold', color: COLORS.text.primary},
  filterRow: {
    flexDirection: 'row',
    padding: SPACING.m,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterText: { fontWeight: '600', color: '#666' },
  filterTextActive: { color: 'white' },
  
  sectionHeader: {
      paddingHorizontal: SPACING.m,
      paddingVertical: 8,
      backgroundColor: '#f8f9fa',
  },
  sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.text.secondary,
      textTransform: 'uppercase',
  },

  // Item
  item:{
    flexDirection: 'row',
    padding: SPACING.m,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadItem: {
    backgroundColor: '#f0f7ff', // Very light blue
  },
  highPriorityItem: {
      backgroundColor: '#fff8e1', // Light gold/amber
      borderLeftWidth: 3,
      borderLeftColor: '#ff9800',
  },
  leftContainer: { marginRight: 12, position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniIconBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      backgroundColor: COLORS.primary,
      width: 16,
      height: 16,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#fff'
  },
  contentContainer: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  itemTitle: { fontSize: 14, color: COLORS.text.primary },
  bold: { fontWeight: 'bold' },
  time: { fontSize: 11, color: COLORS.text.tertiary, marginLeft: 8 },
  itemBody: { fontSize: 13, color: COLORS.text.secondary, lineHeight: 18 },
  
  // Rich Content
  postThumbnail: {
      width: '100%',
      height: 120,
      borderRadius: 8,
      marginTop: 8,
      resizeMode: 'cover',
  },
  
  // Actions
  actionButtons: {
      flexDirection: 'row',
      marginTop: 8,
      gap: 10,
  },
  actionBtn: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 6,
  },
  acceptBtn: { backgroundColor: COLORS.primary },
  declineBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  acceptText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  declineText: { color: COLORS.text.secondary, fontWeight: 'bold', fontSize: 12 },

  // Dot
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
    marginTop: 6,
  },

  // Swipe Action
  deleteAction: {
      backgroundColor: '#ff5252',
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      height: '100%',
  },

  // Footer
  footer: { padding: 24, alignItems: 'center' },
  footerLink: { color: COLORS.primary, fontWeight: '600', marginBottom: 8 },
  footerText: { color: COLORS.text.tertiary, fontSize: 12 },

  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 },
});
