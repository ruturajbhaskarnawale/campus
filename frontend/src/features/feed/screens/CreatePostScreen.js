import React, { useState, useRef, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, 
    ScrollView, Switch, Alert, Platform, Image, KeyboardAvoidingView, Modal, FlatList,
    PanResponder, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, RADIUS, SPACING, FONTS } from '../../../core/design/Theme';

// --- Toolbar Component ---
const RichToolbar = ({ onInsert, onFormat }) => (
    <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => onFormat('**')}><Ionicons name="filter-circle-outline" size={20} /></TouchableOpacity>
        <TouchableOpacity onPress={() => onFormat('_')}><Ionicons name="text-outline" size={20} /></TouchableOpacity>
        <TouchableOpacity onPress={() => onFormat('- ')}><Ionicons name="list" size={20} /></TouchableOpacity>
        <TouchableOpacity onPress={() => onFormat('```\n', '\n```')}><Ionicons name="code-slash" size={20} /></TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity onPress={() => onInsert('#')}><Text style={{fontWeight: 'bold'}}>#</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onInsert('@')}><Text style={{fontWeight: 'bold'}}>@</Text></TouchableOpacity>
    </View>
);

// --- Draggable Image Grid Item (Simplified) ---
// Note: Full drag-and-drop requires specialized libs like react-native-draggable-flatlist 
// or dnd-core which are heavy. Implementing a simple "Move Left/Right" or Delete here.
const ImageThumb = ({ item, onRemove, onEditAlt }) => (
    <View style={styles.thumbContainer}>
        <Image source={{ uri: item.uri }} style={styles.thumbImage} />
        <TouchableOpacity style={styles.removeThumb} onPress={onRemove}>
            <Ionicons name="close-circle" size={20} color="red" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.altBtn} onPress={onEditAlt}>
            <Text style={styles.altText}>ALT</Text>
        </TouchableOpacity>
    </View>
);

export default function CreatePostScreen({ navigation }) {
    // State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [skills, setSkills] = useState('');
    const [mediaItems, setMediaItems] = useState([]); // { uri, type, alt }
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [showPoll, setShowPoll] = useState(false);
    const [pollOptions, setPollOptions] = useState(['', '']);
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const descInputRef = useRef(null);
    
    // Autosave
    useEffect(() => {
        loadDraft();
    }, []);
    
    useEffect(() => {
        const saveDraft = async () => {
             const draft = { title, description, skills };
             await AsyncStorage.setItem('post_draft', JSON.stringify(draft));
        };
        const timer = setTimeout(saveDraft, 2000);
        return () => clearTimeout(timer);
    }, [title, description, skills]);

    const loadDraft = async () => {
        const stored = await AsyncStorage.getItem('post_draft');
        if (stored) {
            const d = JSON.parse(stored);
            if (d.title || d.description) {
                Alert.alert("Resume Draft?", "We found an unsaved post.", [
                    { text: "Discard", onPress: () => AsyncStorage.removeItem('post_draft') },
                    { text: "Resume", onPress: () => {
                        setTitle(d.title || '');
                        setDescription(d.description || '');
                        setSkills(d.skills || '');
                    }}
                ]);
            }
        }
    };

    // --- Media Handlers ---
    const pickImage = async () => {
        // No permissions request needed for web or modern Android/iOS often
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
    
    const handleWebDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        // Basic web logic
        const newItems = files.map(file => ({
            uri: URL.createObjectURL(file), // temporary blob
            file: file, // Keep file for upload
            type: file.type.startsWith('image') ? 'image' : 'video',
            alt: ''
        }));
        setMediaItems(prev => [...prev, ...newItems]);
    };

    // --- Rich Text Handlers ---
    const insertText = (text) => {
        setDescription(prev => prev + text);
        // Focus logic could go here
    };
    
    const formatText = (syntax, endSyntax = syntax) => {
        // Simple append for now. Real rich text needs selection state tracking.
        setDescription(prev => prev + syntax + "text" + endSyntax);
    };

    // --- Upload Logic ---
    const handlePost = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert("Required", "Please add a title and description.");
            return;
        }

        setLoading(true);
        setUploadProgress(10); // Start
        
        try {
            // 1. Upload Media
            const uploadedMedia = [];
            for (let i = 0; i < mediaItems.length; i++) {
                const item = mediaItems[i];
                // If it's a web file object or uri
                const formData = new FormData();
                
                if (Platform.OS === 'web' && item.file) {
                    formData.append('file', item.file);
                } else {
                    // Normalize URI for native
                    const filename = item.uri.split('/').pop();
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image`;
                    formData.append('file', { uri: item.uri, name: filename, type });
                }
                
                const res = await client.post('/feed/upload_media', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                         const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                         // Approximation for multiple files
                         setUploadProgress(10 + (i / mediaItems.length * 80) + (percentCompleted / mediaItems.length));
                    }
                });
                
                uploadedMedia.push({ url: res.data.url, alt: item.alt });
            }
            
            setUploadProgress(90);

            // 2. Submit Post
            const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
            const payload = {
                title,
                description,
                skills_needed: skillsArray,
                media_items: uploadedMedia,
                scheduled_for: isScheduled ? scheduledTime : null,
                visibility,
                poll_options: showPoll ? pollOptions.filter(o => o.trim()) : [],
                author_uid: await getCurrentUserId()
            };

            await client.post('/feed/create', payload);
            setUploadProgress(100);
            setShowConfetti(true);
            
            // Clear draft
            await AsyncStorage.removeItem('post_draft');
            
            Alert.alert("Success", "Post created!");
            navigation.goBack();

        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Upload failed. Your text is saved.");
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    if (showPreview) {
        return (
            <View style={styles.previewContainer}>
                <View style={styles.header}>
                     <TouchableOpacity onPress={() => setShowPreview(false)}><Text style={styles.link}>Edit</Text></TouchableOpacity>
                     <Text style={styles.headerTitle}>Preview</Text>
                     <TouchableOpacity onPress={handlePost} disabled={loading}><Text style={styles.primaryLink}>Post</Text></TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{padding: 20}}>
                    {mediaItems.length > 0 && <Image source={{ uri: mediaItems[0].uri }} style={{width: '100%', height: 200, borderRadius: 8, marginBottom: 15}} />}
                    <Text style={{fontSize: 22, fontWeight: 'bold'}}>{title}</Text>
                    <Text style={{fontSize: 16, marginTop: 10, color: '#333'}}>{description}</Text>
                    {showPoll && pollOptions.map((o, i) => (
                         <View key={i} style={styles.pollOption}><Text>{o}</Text></View>
                    ))}
                </ScrollView>
                {loading && (
                    <View style={styles.loaderOverlay}>
                        <ActivityIndicator size="large" color="white" />
                        <Text style={{color: 'white', marginTop: 10}}>{Math.round(uploadProgress)}%</Text>
                    </View>
                )}
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Project</Text>
                <TouchableOpacity onPress={() => setShowPreview(true)}><Text style={styles.primaryLink}>Preview</Text></TouchableOpacity>
            </View>

            <ScrollView style={styles.container}>
                {/* 1. Drag & Drop Zone (Web) / Image Picker */}
                <View 
                    style={styles.dropZone}
                    // Web Drop Events
                    onDragOver={Platform.OS === 'web' ? (e) => e.preventDefault() : undefined}
                    onDrop={Platform.OS === 'web' ? handleWebDrop : undefined}
                >
                    {mediaItems.length === 0 ? (
                        <TouchableOpacity style={styles.uploadPlaceholder} onPress={pickImage}>
                            <Ionicons name="cloud-upload-outline" size={40} color={COLORS.primary} />
                            <Text style={styles.uploadText}>Tap to upload or drag images here</Text>
                        </TouchableOpacity>
                    ) : (
                        <ScrollView horizontal style={{height: 120}}>
                            {mediaItems.map((item, index) => (
                                <ImageThumb 
                                    key={index} 
                                    item={item} 
                                    onRemove={() => setMediaItems(mediaItems.filter((_, i) => i !== index))}
                                    onEditAlt={() => {
                                        Alert.prompt("Alt Text", "Describe image for accessibility", [
                                            { text: "Save", onPress: (txt) => {
                                                const newItems = [...mediaItems];
                                                newItems[index].alt = txt;
                                                setMediaItems(newItems);
                                            }}
                                        ], "plain-text", item.alt);
                                    }}
                                />
                            ))}
                            <TouchableOpacity style={styles.addMoreBtn} onPress={pickImage}>
                                <Ionicons name="add" size={30} color="#888" />
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </View>

                {/* Title */}
                <TextInput 
                    style={styles.titleInput} 
                    placeholder="Project Title" 
                    value={title} 
                    onChangeText={setTitle}
                    maxLength={100}
                />

                {/* 3. Rich Text Toolbar & Editor */}
                <RichToolbar onInsert={insertText} onFormat={formatText} />
                <TextInput 
                    ref={descInputRef}
                    style={styles.descInput} 
                    placeholder="Tell your story... (Supports Markdown)" 
                    value={description} 
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                />
                {/* 14. Char Ring (Simple Counter) */}
                <Text style={styles.charCount}>{description.length} / 5000</Text>

                {/* Settings Section */}
                <View style={styles.settingsSection}>
                    {/* Skills */}
                    <Text style={styles.label}>Skills Needed</Text>
                    <TextInput style={styles.input} placeholder="e.g. React, UX Design" value={skills} onChangeText={setSkills} />

                    {/* 7. Polls */}
                    <View style={styles.row}>
                        <Text style={styles.label}>Create Poll</Text>
                        <Switch value={showPoll} onValueChange={setShowPoll} trackColor={{true: COLORS.primary}} />
                    </View>
                    {showPoll && (
                        <View style={styles.pollContainer}>
                             {pollOptions.map((opt, i) => (
                                 <TextInput 
                                    key={i} 
                                    style={styles.pollInput} 
                                    placeholder={`Option ${i+1}`} 
                                    value={opt}
                                    onChangeText={(txt) => {
                                        const newOpts = [...pollOptions];
                                        newOpts[i] = txt;
                                        setPollOptions(newOpts);
                                    }}
                                 />
                             ))}
                        </View>
                    )}

                    {/* 11. Schedule */}
                    <View style={styles.row}>
                        <Text style={styles.label}>Schedule Post</Text>
                        <Switch value={isScheduled} onValueChange={setIsScheduled} trackColor={{true: COLORS.primary}} />
                    </View>
                    {isScheduled && (
                        <TextInput style={styles.input} placeholder="YYYY-MM-DD HH:MM" value={scheduledTime} onChangeText={setScheduledTime} />
                    )}

                    {/* 12. Visibility */}
                    <View style={styles.row}>
                         <Text style={styles.label}>Visibility</Text>
                         {/* Simple toggle for demo, real app uses Picker or Modal */}
                         <TouchableOpacity onPress={() => setVisibility(visibility === 'public' ? 'connections' : 'public')}>
                             <Text style={styles.valueLink}>{visibility === 'public' ? 'Everyone' : 'Connections Only'}</Text>
                         </TouchableOpacity>
                    </View>
                </View>
                
                <View style={{height: 100}} /> 
            </ScrollView>
            
            {loading && (
                 <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color="white" />
                    <Text style={{color: 'white', marginTop: 10}}>{Math.round(uploadProgress)}% Uploading...</Text>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center', marginTop: Platform.OS === 'android' ? 24 : 0 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    primaryLink: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
    link: { color: COLORS.text.secondary, fontSize: 16 },
    
    dropZone: { height: 150, backgroundColor: '#f8f8f8', margin: 16, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', overflow: 'hidden' },
    uploadPlaceholder: { alignItems: 'center', padding: 20 },
    uploadText: { marginTop: 10, color: '#888' },
    
    thumbContainer: { width: 100, height: 100, margin: 10, borderRadius: 8, overflow: 'hidden' },
    thumbImage: { width: '100%', height: '100%' },
    removeThumb: { position: 'absolute', top: 2, right: 2, backgroundColor: 'white', borderRadius: 10 },
    altBtn: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, alignItems: 'center' },
    altText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    addMoreBtn: { width: 60, height: 100, margin: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee', borderRadius: 8 },
    
    titleInput: { fontSize: 24, fontWeight: 'bold', padding: 16, color: COLORS.text.primary },
    toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee', gap: 15 },
    divider: { width: 1, height: 20, backgroundColor: '#ddd' },
    
    descInput: { padding: 16, fontSize: 16, minHeight: 150, color: COLORS.text.primary },
    charCount: { textAlign: 'right', paddingRight: 16, fontSize: 12, color: '#aaa', marginBottom: 10 },
    
    settingsSection: { padding: 16, borderTopWidth: 8, borderTopColor: '#f5f5f5' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    label: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
    input: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 16 },
    valueLink: { color: COLORS.primary, fontWeight: '500' },
    
    pollContainer: { marginLeft: 10, marginBottom: 16, borderLeftWidth: 2, borderLeftColor: COLORS.primary, paddingLeft: 10 },
    pollInput: { borderBottomWidth: 1, borderBottomColor: '#eee', padding: 8, marginBottom: 8 },
    pollOption: { padding: 10, backgroundColor: '#f0f0f0', marginBottom: 5, borderRadius: 5 },
    
    previewContainer: { flex: 1, backgroundColor: 'white', marginTop: Platform.OS === 'android' ? 24 : 0  },
    loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
});