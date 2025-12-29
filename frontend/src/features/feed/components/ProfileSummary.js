import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../../../core/design/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';

export default function ProfileSummary() {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
             const uid = await getCurrentUserId();
             if (!uid) return;
             try {
                const res = await client.get('/auth/me'); // Or profile endpoint
                if (res.data) setUser(res.data);
             } catch (e) {
                console.log("ProfileSummary Error", e);
             } finally {
                setLoading(false);
             }
        };
        loadProfile();
    }, []);

    if (loading) return (
        <View style={[styles.card, { height: 200, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{color: COLORS.text.tertiary}}>Loading...</Text>
        </View>
    );

    if (!user) return null;

    return (
        <View style={styles.card}>
            {/* Cover / Header */}
            <View style={styles.headerBg}>
                <View style={styles.avatarContainer}>
                    <Image 
                        source={{ uri: user.avatar_url || 'https://i.pravatar.cc/150' }} 
                        style={styles.avatar} 
                    />
                </View>
            </View>

            <View style={styles.content}>
                <TouchableOpacity onPress={() => navigation.navigate('Profile', { uid: user.uid })}>
                    <Text style={styles.name}>{user.name}</Text>
                </TouchableOpacity>
                <Text style={styles.role}>{user.role || 'Student'}</Text>
                
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{user.stats?.views || 0}</Text>
                        <Text style={styles.statLabel}>Views</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{user.stats?.followers || 0}</Text>
                        <Text style={styles.statLabel}>Connections</Text>
                    </View>
                </View>

                {/* Suggestions / Completion */}
                <View style={styles.suggestionBox}>
                    <Text style={styles.suggestionTitle}>Complete your profile</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '70%' }]} /> 
                    </View>
                    <Text style={styles.suggestionText}>Add your GitHub to rank higher!</Text>
                </View>
                
                <TouchableOpacity style={styles.myItemsBtn} onPress={() => navigation.navigate('Profile', { screen: 'Bookmarks' })}>
                     <Ionicons name="bookmark" size={16} color={COLORS.text.primary} />
                     <Text style={styles.myItemsText}>My Items</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.background.card,
        borderRadius: RADIUS.m,
        ...SHADOWS.light,
        overflow: 'hidden',
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: '#eee',
    },
    headerBg: {
        height: 60,
        backgroundColor: COLORS.background.tertiary, // or gradient
        marginBottom: 30, // space for avatar
    },
    avatarContainer: {
        position: 'absolute',
        bottom: -30,
        left: '50%',
        marginLeft: -30,
        borderRadius: 34,
        padding: 4,
        backgroundColor: COLORS.background.card,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    content: {
        alignItems: 'center',
        padding: SPACING.m,
        paddingTop: 0,
    },
    name: {
        ...FONTS.h3,
        fontSize: 16,
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    role: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginBottom: SPACING.m,
    },
    statsRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
        width: '100%',
        justifyContent: 'space-evenly',
        marginBottom: SPACING.m,
    },
    statItem: { alignItems: 'center' },
    statValue: { fontWeight: 'bold', fontSize: 14, color: COLORS.text.primary },
    statLabel: { fontSize: 11, color: COLORS.text.secondary },
    divider: { w: 1, h: '100%', bg: '#eee' }, // using normal style
    suggestionBox: {
        width: '100%',
        marginBottom: SPACING.m,
    },
    suggestionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
    progressBarBg: { height: 6, backgroundColor: '#eee', borderRadius: 3, marginBottom: 4 },
    progressBarFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
    suggestionText: { fontSize: 10, color: COLORS.text.secondary },
    
    myItemsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        width: '100%',
        borderRadius: RADIUS.s,
        backgroundColor: COLORS.background.tertiary, // hover effect
    },
    myItemsText: { marginLeft: 8, fontSize: 13, fontWeight: '500', color: COLORS.text.primary }
});
