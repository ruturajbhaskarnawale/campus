import React, { useEffect, useState } from 'react';
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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { SPACING, SHADOWS } from '../../../core/design/Theme';
import { useTheme } from '../../../core/contexts/ThemeContext';

// Enhanced Mock Data covering all scenarios
const MOCK_ENHANCED_NOTIFS = [];

export default function NotificationsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('All');
  const [uid, setUid] = useState(null);

  useEffect(() => {
    getCurrentUserId().then(id => {
      setUid(id);
      if (id) fetchNotifications(id);
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
    processData(MOCK_ENHANCED_NOTIFS, filter);
  }, [filter]);

  const markAllRead = async () => {
    try {
      await client.post('/notifications/mark_all_read', { uid });
      Alert.alert('Success', 'All notifications marked as read');
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
    if (!item.read) {
      const newSections = sections.map(sec => ({
        ...sec,
        data: sec.data.map(i => i.id === item.id ? { ...i, read: true } : i)
      }));
      setSections(newSections);

      if (uid) {
        client.post('/notifications/mark_read', { uid, nid: item.id }).catch(() => { });
      }
    }
  };

  const deleteItem = (itemId) => {
    const newSections = sections.map(sec => ({
      ...sec,
      data: sec.data.filter(i => i.id !== itemId)
    })).filter(sec => sec.data.length > 0);
    setSections(newSections);
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background.primary }]}>
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{title}</Text>
    </View>
  );

  const renderRightActions = (progress, dragX, itemId) => {
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
            { backgroundColor: colors.background.card, borderBottomColor: colors.border },
            isUnread && { backgroundColor: isDark ? colors.primary + '10' : '#f0f7ff' },
            isHighPriority && { backgroundColor: isDark ? '#332b00' : '#fff8e1', borderLeftWidth: 3, borderLeftColor: '#ff9800' }
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
              <View style={[styles.miniIconBadge, { backgroundColor: colors.primary, borderColor: colors.background.card }]}>
                <Ionicons name={getIcon(item.type)} size={10} color="#fff" />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.itemTitle, { color: colors.text.primary }, isUnread && styles.bold]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.time, { color: colors.text.tertiary }]}>{item.timestamp}</Text>
            </View>

            <Text style={[styles.itemBody, { color: colors.text.secondary }]} numberOfLines={3}>
              {item.body}
            </Text>

            {/* Rich Content: Post Image */}
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.postThumbnail} />
            )}

            {/* Actions (Join Request) */}
            {item.type === 'join_request' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => alert('Accepted')}>
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => alert('Declined')}>
                  <Text style={[styles.declineText, { color: colors.text.secondary }]}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Unread Dot */}
          {isUnread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
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
    if (t === 'follow') return 'person-add';
    return 'notifications';
  };
  const getIconColor = (t) => {
    if (t === 'group_like') return '#e91e63';
    if (t === 'job_offer') return '#ff9800'; // Gold/Orange
    if (t === 'deadline') return '#f44336';
    if (t === 'birthday') return '#9c27b0';
    if (t === 'system_alert') return '#607d8b';
    if (t === 'follow') return '#007AFF';
    return colors.primary;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Notifications</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity onPress={markAllRead}>
              <Ionicons name="checkmark-done-circle-outline" size={26} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => alert('Settings')}>
              <Ionicons name="settings-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.filterRow, { backgroundColor: colors.background.card, borderBottomColor: colors.border }]}>
          {['All', 'Mentions', 'Requests'].map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                { backgroundColor: colors.background.tertiary },
                filter === f && { backgroundColor: colors.primary }
              ]}
              onPress={() => setFilter(f)}
            >
              <Text style={[
                styles.filterText,
                { color: colors.text.secondary },
                filter === f && { color: 'white' }
              ]}>{f}</Text>
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
                <Text style={[styles.footerLink, { color: colors.primary }]}>Manage settings</Text>
              </TouchableOpacity>
              <Text style={[styles.footerText, { color: colors.text.tertiary }]}>That's all for now!</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.text.tertiary} />
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>All caught up!</Text>
            </View>
          }
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: SPACING.m,
    paddingTop: Platform.OS === 'android' ? 40 : SPACING.m,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  filterRow: {
    flexDirection: 'row',
    padding: SPACING.m,
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: { fontWeight: '600' },

  sectionHeader: {
    paddingHorizontal: SPACING.m,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Item
  item: {
    flexDirection: 'row',
    padding: SPACING.m,
    borderBottomWidth: 1,
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
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  contentContainer: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  itemTitle: { fontSize: 14 },
  bold: { fontWeight: 'bold' },
  time: { fontSize: 11, marginLeft: 8 },
  itemBody: { fontSize: 13, lineHeight: 18 },

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
  acceptText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  declineText: { fontWeight: 'bold', fontSize: 12 },

  // Dot
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  footerLink: { fontWeight: '600', marginBottom: 8 },
  footerText: { fontSize: 12 },

  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, fontSize: 16 },
});
