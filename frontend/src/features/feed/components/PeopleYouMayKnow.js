import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../../core/design/Theme';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../core/api/client';

export default function PeopleYouMayKnow({ vertical = false }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // Fetch top users/suggestions
                const res = await client.get('/top-users');
                const data = res.data || [];
                setUsers(data);
            } catch (e) {
                console.error("PYMK Error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    if (loading || users.length === 0) return null;

    const renderItem = ({ item }) => (
        <View style={[styles.card, vertical && styles.verticalCard]}>
            <View style={styles.avatarContainer}>
                {item.avatar && item.avatar.startsWith('http') ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>
                            {item.name[0]}
                        </Text>
                    </View>
                )}
            </View>
            <View style={{ flex: 1, alignItems: vertical ? 'flex-start' : 'center' }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.role} numberOfLines={1}>{item.title || 'Student'}</Text>
            </View>

            <TouchableOpacity
                style={styles.connectBtn}
                onPress={async () => {
                    try {
                        const uid = await import('../../../core/auth').then(m => m.getCurrentUserId());
                        if (uid) await client.post('/social/follow', { follower: uid, followee: item.uid || item.id });
                        // Optimistic update could happen here or parent refresh
                        alert('Followed ' + item.name);
                    } catch (e) { console.error(e); }
                }}
            >
                <Ionicons name="person-add-outline" size={16} color={COLORS.primary} />
                <Text style={styles.connectText}>Follow</Text>
            </TouchableOpacity>
        </View>
    );

    if (vertical) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>People You May Know</Text>
                </View>
                <View style={styles.list}>
                    {users.map(item => (
                        <View key={item.id}>
                            {renderItem({ item })}
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>People You May Know</Text>
            </View>
            <FlatList
                horizontal
                data={users}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.m,
        marginTop: SPACING.s,
    },
    header: {
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.s,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    list: {
        paddingHorizontal: SPACING.m,
        paddingBottom: SPACING.s,
    },
    card: {
        backgroundColor: COLORS.background.card,
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        marginRight: SPACING.m,
        alignItems: 'center',
        width: 140,
        ...SHADOWS.light,
        borderWidth: 1,
        borderColor: '#eee',
    },
    verticalCard: {
        width: '100%',
        marginRight: 0,
        marginBottom: SPACING.s,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    avatarContainer: {
        marginBottom: SPACING.s,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eee',
    },
    name: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    role: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginBottom: 8, // Default
    },
    verticalCard: {
        width: '100%',
        marginRight: 0,
        marginBottom: SPACING.s,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8, // Compact
        gap: 12
    },
    connectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: RADIUS.round,
        backgroundColor: COLORS.background.tertiary,
        gap: 4,
    },
    connectText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
});
