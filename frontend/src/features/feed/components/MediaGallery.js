
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../core/design/Theme';

const { width } = Dimensions.get('window');

export default function MediaGallery({ items, onAdd, onRemove }) {
    if (!items || items.length === 0) {
        return (
            <TouchableOpacity style={styles.placeholder} onPress={onAdd}>
                <View style={styles.iconCircle}>
                    <Ionicons name="image-outline" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.placeholderText}>Add Cover Image or Video</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 20}}>
                {items.map((item, index) => (
                    <View key={index} style={styles.card}>
                        <Image source={{ uri: item.uri }} style={styles.image} />
                        <TouchableOpacity style={styles.closeBtn} onPress={() => onRemove(index)}>
                            <Ionicons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
                    <Ionicons name="add" size={30} color="#ccc" />
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 20, marginTop: 10 },
    placeholder: { 
        height: 200, backgroundColor: '#F8FAFC', marginHorizontal: 20, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0',
        marginBottom: 20
    },
    iconCircle: {
        width: 50, height: 50, borderRadius: 25, backgroundColor: '#EFF6FF',
        justifyContent: 'center', alignItems: 'center', marginBottom: 10
    },
    placeholderText: { color: '#64748B', fontWeight: 'bold' },
    
    card: { 
        width: width * 0.7, height: 220, marginRight: 15, borderRadius: 20, 
        overflow: 'hidden', backgroundColor: '#f0f0f0',
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: {width:0, height:5}
    },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },
    closeBtn: {
        position: 'absolute', top: 10, right: 10,
        width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center', alignItems: 'center'
    },
    addBtn: {
        width: 80, height: 220, borderRadius: 20, backgroundColor: '#F8FAFC',
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee', marginRight: 20
    }
});
