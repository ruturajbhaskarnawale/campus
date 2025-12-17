import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SHADOWS, SPACING, RADIUS, FONTS } from '../../../core/design/Theme';

const MOCK_ENHANCED_NOTIFS = [
  { id: 'mock1', type: 'join_request', title: 'Join Request', body: 'Alice Chen wants to join "AI Study Group"', timestamp: '2m ago', read: false, project: 'AI Study Group', user: 'Alice Chen' },
  { id: 'mock2', type: 'group_like', title: 'Project Love', body: 'Sarah and 5 others liked your project "CampusHub"', timestamp: '1h ago', read: false },
  { id: 'mock3', type: 'app_status', title: 'Application Update', body: 'Your application to "EcoTracker" is Under Review', timestamp: '3h ago', read: true, status: 'Under Review' },
  { id: 'mock4', type: 'reminder', title: 'Saved Project', body: 'You saved "CryptoWallet" 3 days ago - applications closing soon!', timestamp: '5h ago', read: true },
  { id: 'mock5', type: 'mention', title: 'Mentioned you', body: 'Bob: @me check this API endpoint', timestamp: '1d ago', read: true, context: 'Team Alpha Chat' },
  { id: 'mock6', type: 'skill_alert', title: 'Skill Alert', body: '3 new projects match your "React Native" skill', timestamp: '1d ago', read: true },
  { id: 'mock7', type: 'digest', title: 'Weekly Digest', body: 'Top projects you missed this week', timestamp: '2d ago', read: true, isDigest: true },
];

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
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
      // Merge real + mock for demo
      const real = res.data || [];
      setItems([...MOCK_ENHANCED_NOTIFS, ...real]); 
    } catch (e) { 
      console.error('fetch notifications', e); 
      setItems(MOCK_ENHANCED_NOTIFS); // Fallback to mock
    }
    finally { setLoading(false); }
  };

  const NotificationCard = ({ item }) => {
    const isUnread = !item.read;

    // Actionable Join Request
    if (item.type === 'join_request') {
      return (
        <View style={[styles.item, styles.actionItem, isUnread && styles.unreadBorder]}>
           <View style={styles.row}>
             <View style={[styles.iconContainer, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name="person-add" size={20} color={COLORS.primary} />
             </View>
             <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemBody}>
                  <Text style={{ fontWeight: 'bold' }}>{item.user}</Text> wants to join <Text style={{ fontWeight: 'bold' }}>{item.project}</Text>
                </Text>
                <Text style={styles.time}>{item.timestamp}</Text>
             </View>
           </View>
           <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => alert('Accepted')}>
                 <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={() => alert('Declined')}>
                 <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
           </View>
        </View>
      );
    }

    // Application Status
    if (item.type === 'app_status') {
       let statusColor = '#ff9800'; // Under Review
       if (item.status === 'Accepted') statusColor = '#4caf50';
       if (item.status === 'Viewed') statusColor = '#2196f3';

       return (
        <View style={[styles.item, isUnread && styles.unreadBorder]}>
            <View style={[styles.iconContainer, { backgroundColor: statusColor + '20' }]}>
               <Ionicons name="briefcase" size={20} color={statusColor} />
            </View>
            <View style={{ flex: 1 }}>
               <Text style={styles.itemTitle}>Application Status: <Text style={{ color: statusColor }}>{item.status}</Text></Text>
               <Text style={styles.itemBody}>{item.body}</Text>
               <Text style={styles.time}>{item.timestamp}</Text>
            </View>
        </View>
       );
    }

    // Weekly Digest
    if (item.type === 'digest') {
       return (
        <View style={[styles.item, styles.digestItem]}>
            <LinearGradient
               colors={[COLORS.primary, COLORS.secondary]}
               style={styles.digestGradient}
               start={{ x:0, y:0 }} end={{ x:1, y:1 }}
            >
               <Ionicons name="newspaper" size={24} color="#fff" style={{ marginRight: 12 }} />
               <View>
                  <Text style={styles.digestTitle}>{item.title}</Text>
                  <Text style={styles.digestBody}>{item.body}</Text>
               </View>
               <Ionicons name="chevron-forward" size={24} color="#fff" style={{ marginLeft: 'auto' }} />
            </LinearGradient>
        </View>
       );
    }

    // Generic
    const getIcon = (t) => {
        if (t === 'group_like') return 'heart';
        if (t === 'reminder') return 'time';
        if (t === 'mention') return 'at';
        if (t === 'skill_alert') return 'flash';
        if (t === 'event') return 'calendar';
        return 'notifications';
    }
    const getColor = (t) => {
        if (t === 'group_like') return '#e91e63';
        if (t === 'reminder') return '#ff5722';
        if (t === 'mention') return '#9c27b0';
        if (t === 'skill_alert') return '#ffc107';
        return COLORS.primary;
    }

    return (
        <View style={[styles.item, isUnread ? styles.unreadItem : styles.readItem]}>
            <View style={[styles.iconContainer, { backgroundColor: getColor(item.type) + '20' }]}>
                <Ionicons name={getIcon(item.type)} size={20} color={getColor(item.type)} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemBody}>{item.body}</Text>
                {item.context && <Text style={styles.contextText}>{item.context}</Text>}
                <Text style={styles.time}>{item.timestamp}</Text>
            </View>
            {isUnread && <View style={styles.dot} />}
        </View>
    );
  };

  const filteredItems = items.filter(i => {
    if (filter === 'All') return true;
    if (filter === 'Mentions') return i.type === 'mention' || i.title.includes('@');
    if (filter === 'System') return ['app_status', 'skill_alert', 'reminder', 'digest'].includes(i.type);
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity>
             <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {['All', 'Mentions', 'System'].map(f => (
            <TouchableOpacity 
                key={f} 
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
            >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(it, idx) => it.id || String(idx)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchNotifications(uid)} />}
        contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
        renderItem={({ item }) => <NotificationCard item={item} />}
        ListEmptyComponent={
            <View style={styles.empty}>
                <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>All caught up!</Text>
            </View>
        }
      />
    </SafeAreaView>
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
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: { fontWeight: '600', color: '#666' },
  filterTextActive: { color: 'white' },
  
  item:{
    flexDirection: 'row',
    padding: SPACING.m,
    backgroundColor: 'white',
    borderRadius: 12, // More rounded
    marginBottom: SPACING.s,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  unreadItem: {
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  unreadBorder: {
      borderLeftWidth: 3,
      borderLeftColor: COLORS.primary,
  },
  readItem: {
    opacity: 0.9,
    backgroundColor: '#fcfcfc',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  itemTitle:{fontWeight:'bold', fontSize: 15, color: COLORS.text.primary},
  itemBody:{color:'#555', marginTop: 2, fontSize: 13, lineHeight: 18},
  time:{color:'#999',fontSize:11,marginTop:4},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    marginLeft: 8,
  },
  contextText: {
      fontSize: 11,
      color: COLORS.primary,
      marginTop: 2,
      fontWeight: '500',
  },
  
  // Action Item Styles
  actionItem: {
      flexDirection: 'column',
      alignItems: 'flex-start',
  },
  row: { flexDirection: 'row', width: '100%', alignItems: 'center' },
  actionButtons: {
      flexDirection: 'row',
      marginTop: 12,
      marginLeft: 56, // Align with text
      gap: 10,
  },
  actionBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
  },
  acceptBtn: { backgroundColor: COLORS.primary },
  declineBtn: { backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#ffcdd2' },
  acceptText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  declineText: { color: '#d32f2f', fontWeight: 'bold', fontSize: 13 },

  // Digest styles
  digestItem: {
      padding: 0,
      overflow: 'hidden',
  },
  digestGradient: {
      flexDirection: 'row',
      padding: SPACING.m,
      width: '100%',
      alignItems: 'center',
  },
  digestTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  digestBody: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },

  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 },
});
