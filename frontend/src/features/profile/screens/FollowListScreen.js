import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../../core/design/Theme';

export default function FollowListScreen({ route, navigation }) {
    const { userId, type } = route.params || {}; // type: 'followers' | 'following'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUid, setCurrentUid] = useState(null);

    useEffect(() => {
        loadData();
    }, [userId, type]);

    const loadData = async () => {
        try {
            const uid = await getCurrentUserId();
            setCurrentUid(uid);

            const endpoint = type === 'following'
                ? `/social/following/${userId}`
                : `/social/followers/${userId}`;

            const res = await client.get(endpoint);
            const data = res.data || [];

            // The endpoint returns { follower: uid, followee: uid, timestamp: ... }
            // We need to resolve user details. Since backend doesn't return full user obj here (based on research),
            // we might need to fetch user details or update backend. 
            // Wait, previous research on social/routes.py showed it returns list of objects but NOT full user details?
            // Let's re-read social/routes.py. 
            // Step 25: It returns { follower: u.uid, followee: user_id ... }
            // Wait, it DOES NOT return names/avatars? 
            // Step 25 code: 
            // out.append({ 'follower': u.uid, ... })
            // It does NOT return name/avatar. THIS IS A BACKEND BUG/MISSING FEATURE.
            // I need to update backend to return name/avatar in followers/following list.

            // Temporarily, I will assume backend is/will be updated or I fetch details. 
            // Construct list for now.
            setUsers(data);

            // If valid uids, we might want to fetch their profiles or rely on backend update.
            // I will update backend to include name/avatar.

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Action Handler
    const handleAction = async (item, index) => {
        try {
            const targetUid = type === 'following' ? item.followee : item.follower;
            const currentItem = users[index];

            // Toggle Logic
            // If already following (which is true if type='following'), we unfollow.
            // If type='followers', we might not be following them. 
            // The item from backend should ideally tell us 'is_following_back' but currently we only know 'type'.

            // Simplified:
            // If type=='following': "Following" -> Click -> Unfollow.
            // If type=='followers': Check if I follow them? (Missing data).
            // For now, let's assume valid 'status' update.

            // Since we don't have is_following_back in the followers list yet (could be added), 
            // we will just support "Unfollow" for the "Following" list for now, 
            // and "Remove" (block/soft-remove) for "Followers" list OR "Follow Back" if we can detect it.

            if (type === 'following') {
                // Unfollow
                await client.post('/social/unfollow', {
                    follower: currentUid,
                    followee: targetUid
                });
                // Remove from list
                const newUsers = [...users];
                newUsers.splice(index, 1);
                setUsers(newUsers);
            } else {
                // Followers list. 
                // If I want to follow back:
                // Ideally button says "Follow Back".
                await client.post('/social/follow', {
                    follower: currentUid,
                    followee: targetUid
                });
                alert('Followed back!');
            }

        } catch (e) { console.error(e); }
    };

    const renderItem = ({ item, index }) => {
        // We need name/avatar.
        // Assuming backend sends it.
        const name = item.name || item.uid || "User";
        const avatar = item.avatar_url;
        const targetUid = type === 'following' ? item.followee : item.follower;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.push('ProfileDetail', { userId: targetUid })}
            >
                <Image source={{ uri: avatar || 'https://picsum.photos/50' }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.uid}>@{item.username || 'user'}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.btn, type === 'following' ? { backgroundColor: '#ffebee' } : { backgroundColor: COLORS.primary }]}
                    onPress={() => handleAction(item, index)}
                >
                    <Text style={[styles.btnText, type === 'following' ? { color: 'red' } : { color: 'white' }]}>
                        {type === 'following' ? 'Unfollow' : 'Follow Back'}
                    </Text>
                </TouchableOpacity>

            </TouchableOpacity>
        );
    };

    if (loading) return <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.back ? navigation.back() : navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>{type === 'following' ? 'Following' : 'Followers'}</Text>
            </View>
            <FlatList
                data={users}
                renderItem={renderItem}
                keyExtractor={(item, i) => i.toString()}
                contentContainerStyle={{ padding: SPACING.m }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background.primary },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        paddingTop: 50,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    title: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    card: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#eee' },
    name: { fontWeight: '700', fontSize: 16 },
    uid: { color: '#888', fontSize: 14 },
    btn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#eee', borderRadius: 6 },
    btnText: { fontWeight: '600' }
});
