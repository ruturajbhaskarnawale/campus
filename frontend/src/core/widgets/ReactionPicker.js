import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../design/Theme';

const REACTIONS = [
    { type: 'like', emoji: '👍', label: 'Like' },
    { type: 'love', emoji: '❤️', label: 'Love' },
    { type: 'celebrate', emoji: '👏', label: 'Celebrate' },
    { type: 'funny', emoji: '😂', label: 'Funny' },
    { type: 'insightful', emoji: '💡', label: 'Insight' }
];

export default function ReactionPicker({ visible, onClose, onSelect }) {
    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.container}>
                    {REACTIONS.map((r, i) => (
                        <TouchableOpacity key={i} style={styles.item} onPress={() => onSelect(r.type)}>
                            <Text style={styles.emoji}>{r.emoji}</Text>
                            <Text style={styles.label}>{r.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: SPACING.m,
        borderRadius: RADIUS.full,
        ...SHADOWS.medium,
        gap: SPACING.m,
    },
    item: {
        alignItems: 'center',
    },
    emoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    label: {
        fontSize: 10,
        color: COLORS.text.secondary,
    }
});
