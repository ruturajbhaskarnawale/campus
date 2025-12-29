import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SPACING, SHADOWS, FONTS } from '../../../core/design/Theme';

const { width } = Dimensions.get('window');

export default function ProfileDetail({ route, navigation }) {
  const { userId } = route.params || {};
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState(null);

  useEffect(() => {
    const init = async () => {
      const uid = await getCurrentUserId();
      setCurrentUid(uid);
      if (userId) fetchProfile(uid);
    };
    init();
  }, [userId]);

  const fetchProfile = async (myUid) => {
    setLoading(true);
    try {
      // Use the improved profile endpoint which includes counts!
      const res = await client.get(`/profile/${userId}`);
      setProfile(res.data || {});

      // Fetch posts
      const p = await client.get(`/feed?author=${userId}`);
      const postsData = p.data;
      setPosts(Array.isArray(postsData) ? postsData : (postsData?.data || []));

      // Check follow status (if viewing someone else)
      if (myUid && myUid !== userId) {
        try {
          // We can check /social/followers/userId and see if myUid is in it.
          // OR /social/following/myUid and see if userId is in it.
          // Let's use followers list of target.
          const f = await client.get(`/social/followers/${userId}`);
          const followers = f.data || [];
          // Now that backend returns objects, check 'follower' field (which is uid) OR 'uid' logic?
          // Backend social/followers returns list of object with 'follower' key = uid.
          setIsFollowing(followers.some(it => it.follower === myUid));
        } catch (e) { }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUid) return;
    try {
      // Optimistic update
      const newStatus = !isFollowing;
      setIsFollowing(newStatus);

      if (newStatus) {
        await client.post('/social/follow', { follower: currentUid, followee: userId });
      } else {
        await client.post('/social/unfollow', { follower: currentUid, followee: userId });
      }
      // Refresh profile to update counts (optional, or manually adjust counts state)
      fetchProfile(currentUid);
    } catch (e) {
      setIsFollowing(!isFollowing); // Revert
      console.error(e);
    }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!profile) return <View style={styles.loading}><Text>User not found</Text></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.username || 'Profile'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header Profile Info */}
        <View style={styles.profileHeader}>
          <Image source={{ uri: profile.avatar_url || 'https://picsum.photos/100' }} style={styles.avatar} />
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.role}>{profile.role || 'Student'} • {profile.xp_points || 0} XP</Text>
          <Text style={styles.bio}>{profile.bio || 'No bio provided.'}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{posts.length}</Text>
              <Text style={styles.statLbl}>Posts</Text>
            </View>
            <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('FollowList', { userId, type: 'followers' })}>
              <Text style={styles.statNum}>{profile.followers_count || 0}</Text>
              <Text style={styles.statLbl}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('FollowList', { userId, type: 'following' })}>
              <Text style={styles.statNum}>{profile.following_count || 0}</Text>
              <Text style={styles.statLbl}>Following</Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          {currentUid && currentUid !== userId && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.mainBtn, isFollowing ? styles.followingBtn : styles.followBtn]}
                onPress={handleFollowToggle}
              >
                <Text style={[styles.btnText, isFollowing ? { color: '#000' } : { color: '#fff' }]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Messages', { screen: 'Chat', params: { userId, userName: profile.name } })}>
                <Ionicons name="chatbubble-outline" size={20} color="#333" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Gallery */}
        <View style={styles.gallery}>
          {posts.map(post => (
            <Image
              key={post.id}
              source={{ uri: post.media_urls?.[0] || 'https://picsum.photos/200' }}
              style={styles.postImg}
            />
          ))}
          {posts.length === 0 && <Text style={styles.emptyText}>No posts yet.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontWeight: '700', fontSize: 16 },

  profileHeader: { alignItems: 'center', padding: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: 'bold' },
  role: { color: COLORS.primary, fontWeight: '600', marginBottom: 8 },
  bio: { textAlign: 'center', color: '#666', marginBottom: 20, paddingHorizontal: 20 },

  statsRow: { flexDirection: 'row', gap: 40, marginBottom: 24 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: 'bold' },
  statLbl: { color: '#888', fontSize: 12 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  mainBtn: { paddingVertical: 10, paddingHorizontal: 40, borderRadius: 8, minWidth: 150, alignItems: 'center' },
  followBtn: { backgroundColor: COLORS.primary },
  followingBtn: { backgroundColor: '#eee' },
  btnText: { fontWeight: '600' },
  iconBtn: { padding: 10, borderRadius: 8, backgroundColor: '#f0f0f0' },

  gallery: { flexDirection: 'row', flexWrap: 'wrap', padding: 2 },
  postImg: { width: width / 3 - 4, height: width / 3 - 4, margin: 2, borderRadius: 0 },
  emptyText: { width: '100%', textAlign: 'center', padding: 20, color: '#888' }
});
