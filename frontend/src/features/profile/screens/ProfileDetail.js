import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';

export default function ProfileDetail({ route }) {
  const { userId } = route.params || {};
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const currentUid = getCurrentUserId();

  useEffect(() => { if (userId) fetchProfile(); }, [userId]);

  const fetchProfile = async () => {
    try {
      const res = await client.get(`/auth/profile?uid=${userId}`);
      setProfile(res.data.profile || {});
      // fetch posts by user (simple query)
      const p = await client.get(`/feed?author=${userId}`);
      setPosts(p.data || []);
      // check follow status
      if (currentUid) {
        try {
          const f = await client.get(`/social/followers/${userId}`);
          const followers = f.data || [];
          const followed = followers.some(it => it.follower === currentUid);
          setIsFollowing(!!followed);
          setFollowersCount(followers.length || 0);
        } catch (e) { console.warn('follow check failed', e); }
        try {
          const fo = await client.get(`/social/following/${userId}`);
          setFollowingCount((fo.data || []).length || 0);
        } catch (e) { console.warn('following fetch failed', e); }
      } else {
        // fetch counts for public view
        try {
          const f = await client.get(`/social/followers/${userId}`);
          setFollowersCount((f.data || []).length || 0);
        } catch (e) {}
        try {
          const fo = await client.get(`/social/following/${userId}`);
          setFollowingCount((fo.data || []).length || 0);
        } catch (e) {}
      }
    } catch (e) { console.error(e); }
  };

  return (
    <View style={styles.container}>
      {profile ? (
        <View style={styles.header}>
          <Image source={{ uri: profile.avatar_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23e0e0e0"/><circle cx="50" cy="40" r="22" fill="%23cfcfcf"/><rect x="15" y="70" width="70" height="12" rx="6" fill="%23cfcfcf"/></svg>' }} style={styles.avatar} />
          <View style={{ marginLeft: 12, flex:1 }}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.bio}>{profile.bio || ''}</Text>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              <Text style={{ marginRight: 12, fontWeight: '700' }}>{followersCount} Followers</Text>
              <Text style={{ fontWeight: '700' }}>{followingCount} Following</Text>
            </View>
            {profile.github_link ? (
              <Text style={{ color: '#007AFF', marginTop: 8 }} onPress={() => {
                try { window.open(profile.github_link, '_blank'); } catch(e) {}
              }}>{profile.github_link}</Text>
            ) : null}
            {profile.resume_url ? (
              <Text style={{ color: '#007AFF', marginTop: 6 }} onPress={() => {
                try { window.open(profile.resume_url, '_blank'); } catch(e) {}
              }}>View Resume</Text>
            ) : null}
            <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
              {(profile.skills || []).slice(0,10).map((s, idx) => (
                <View key={idx} style={{ backgroundColor:'#eee', padding:6, marginRight:6, marginTop:6, borderRadius:6 }}>
                  <Text>{s}</Text>
                </View>
              ))}
            </View>
          </View>
          {currentUid && currentUid !== userId && (
            <TouchableOpacity style={[styles.followBtn, isFollowing ? styles.following : styles.notFollowing]} onPress={async () => {
              try {
                if (isFollowing) {
                  await client.post('/social/unfollow', { follower: currentUid, followee: userId });
                  setIsFollowing(false);
                } else {
                  await client.post('/social/follow', { follower: currentUid, followee: userId });
                  setIsFollowing(true);
                }
              } catch (e) { console.error(e); }
            }}>
              <Text style={{ color: isFollowing ? '#000' : '#fff' }}>{isFollowing ? 'Following' : 'Follow'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : <Text>Loading...</Text>}

      <FlatList data={posts} numColumns={3} keyExtractor={(it) => it.id} renderItem={({ item }) => (
        <Image source={{ uri: item.media_urls?.[0] || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="%23e0e0e0"/></svg>' }} style={styles.postImg} />
      )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  name: { fontSize: 18, fontWeight: '700' },
  bio: { color: '#666' },
  postImg: { width: 110, height: 110, margin: 4 },
  followBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  following: { backgroundColor: '#eee' },
  notFollowing: { backgroundColor: '#007AFF' }
});
