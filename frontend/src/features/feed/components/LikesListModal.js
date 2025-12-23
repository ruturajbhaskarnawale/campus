import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../core/api/client';
import { COLORS, SPACING, RADIUS } from '../../../core/design/Theme';

export default function LikesListModal({ visible, onClose, postId, navigation }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible && postId) {
            fetchLikes();
        }
    }, [visible, postId]);

    const fetchLikes = async () => {
        setLoading(true);
        try {
            const res = await client.get(`/feed/${postId}/likes`);
            setUsers(res.data);
        } catch (e) {
            console.error("Error fetching likes:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Likes</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.text.primary} />
                        </TouchableOpacity>
                    </View>
                    
                    {loading ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={users}
                            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.userRow}
                                    onPress={() => {
                                        onClose();
                                        if(navigation) navigation.navigate('Profile', { userId: item.uid });
                                    }}
                                >
                                    <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                                    <View>
                                        <Text style={styles.username}>{item.username}</Text>
                                        <Text style={styles.fullname}>{item.full_name}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyText}>No likes yet.</Text>}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    overlayTouch: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: COLORS.background.card,
        borderTopLeftRadius: RADIUS.l,
        borderTopRightRadius: RADIUS.l,
        height: '60%',
        padding: SPACING.m,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: SPACING.s,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.s,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: SPACING.m,
        backgroundColor: '#eee',
    },
    username: {
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    fullname: {
        color: COLORS.text.secondary,
        fontSize: 12,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: COLORS.text.secondary,
    }
});
