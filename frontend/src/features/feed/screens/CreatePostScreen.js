
import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, 
    ScrollView, KeyboardAvoidingView, Platform, Alert, SafeAreaView, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SPACING, FONTS } from '../../../core/design/Theme';

import MediaGallery from '../components/MediaGallery';
import SettingsSheet from '../components/SettingsSheet';

export default function CreatePostScreen({ navigation }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [mediaItems, setMediaItems] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        visibility: 'public',
        isScheduled: false,
        scheduledTime: '',
        skills: '',
        showPoll: false,
        pollOption1: '',
        pollOption2: ''
    });

    const updateSetting = (key, val) => {
        setSettings(prev => ({ ...prev, [key]: val }));
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            const newItems = result.assets.map(a => ({ uri: a.uri, type: a.type, alt: '' }));
            setMediaItems([...mediaItems, ...newItems]);
        }
    };

    const handlePost = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert("Missing Content", "Please add a title and description to your project.");
            return;
        }

        setLoading(true);
        try {
            // 1. Upload Media
            const uploadedMedia = [];
            for (let item of mediaItems) {
                const formData = new FormData();
                const filename = item.uri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;
                formData.append('file', { uri: item.uri, name: filename, type });
                
                const res = await client.post('/feed/upload_media', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedMedia.push({ url: res.data.url, alt: '' });
            }

            // 2. Prepare Payload
            const payload = {
                title,
                description,
                skills_needed: settings.skills.split(',').map(s => s.trim()).filter(Boolean),
                media_items: uploadedMedia,
                visibility: settings.visibility,
                scheduled_for: settings.isScheduled ? settings.scheduledTime : null,
                poll_options: settings.showPoll ? [settings.pollOption1, settings.pollOption2].filter(Boolean) : [],
                author_uid: await getCurrentUserId()
            };

            await client.post('/feed/create', payload);
            Alert.alert("Success", "Project published!");
            navigation.goBack();

        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to publish project.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Glass Header */}
            <BlurView intensity={80} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePost} disabled={loading} style={[styles.postBtn, loading && {opacity: 0.5}]}>
                    {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.postBtnText}>Post</Text>}
                </TouchableOpacity>
            </BlurView>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Media Gallery (Hero) */}
                    <MediaGallery 
                        items={mediaItems} 
                        onAdd={pickImage} 
                        onRemove={(index) => setMediaItems(mediaItems.filter((_, i) => i !== index))} 
                    />

                    {/* Inputs */}
                    <View style={styles.inputArea}>
                        <TextInput 
                            style={styles.titleInput} 
                            placeholder="Project Title" 
                            placeholderTextColor="#ccc"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={80}
                            multiline
                        />
                        <TextInput 
                            style={styles.descInput} 
                            placeholder="Tell your story..." 
                            placeholderTextColor="#ccc"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            scrollEnabled={false}
                        />
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom Toolbar */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
                <View style={styles.toolbar}>
                    <TouchableOpacity style={styles.toolBtn} onPress={() => setShowSettings(true)}>
                        <Ionicons name="options-outline" size={24} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolBtn} onPress={pickImage}>
                        <Ionicons name="image-outline" size={24} color="#000" />
                    </TouchableOpacity>
                    <View style={{flex: 1}} />
                    <Text style={styles.charCount}>{description.length}/2000</Text>
                </View>
            </KeyboardAvoidingView>

            <SettingsSheet 
                visible={showSettings} 
                onClose={() => setShowSettings(false)} 
                settings={settings}
                onUpdate={updateSetting}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 15,
        backgroundColor: 'rgba(255,255,255,0.8)'
    },
    scrollContent: { paddingTop: 120, paddingBottom: 100 },
    
    closeBtn: { padding: 10, backgroundColor: '#f5f5f5', borderRadius: 20 },
    postBtn: { backgroundColor: '#000', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    postBtnText: { color: '#fff', fontWeight: 'bold' },

    inputArea: { paddingHorizontal: 25 },
    titleInput: { fontSize: 32, fontWeight: '800', marginBottom: 15, color: '#000' },
    descInput: { fontSize: 18, lineHeight: 28, color: '#333', minHeight: 200 },

    toolbar: {
        flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: 1, borderTopColor: '#f0f0f0',
        backgroundColor: '#fff', paddingBottom: Platform.OS === 'ios' ? 30 : 15
    },
    toolBtn: { marginRight: 20, padding: 5 },
    charCount: { color: '#aaa', fontSize: 12 }
});