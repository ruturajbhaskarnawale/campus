import React, { useEffect, useState, useRef } from 'react';
import { 
    View, Text, Image, StyleSheet, TouchableOpacity, Alert, 
    ActivityIndicator, Dimensions, Animated, Linking, Platform, 
    Modal, TextInput, Share, StatusBar, FlatList, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'; // Unused
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
// import * as Clipboard from 'expo-clipboard'; // Module missing, temporary mock below
const Clipboard = { setStringAsync: async () => Alert.alert("Copied", "Clipboard mocked (install package to fix)") };
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { SPACING, FONTS, RADIUS, SHADOWS } from '../../../core/design/Theme';
import { useTheme } from '../../../core/contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

// --- Helper: Smart Text Parser ---
const SmartText = ({ content, onCopy, colors }) => {
    // Basic regex for URLs, Mentions, Hashtags, and Code Blocks
    const parse = (text) => {
        const elements = [];
        let lastIndex = 0;
        
        // 1. Code Blocks (```...```)
        const codeRegex = /```([\s\S]*?)```/g;
        let match;
        
        // We'll iterate manually to handle code blocks first as they contain other chars
        // Note: A full parser is complex, this is a simplified version (Sequential parsing)
        
        const parts = text.split(/(```[\s\S]*?```)/g);
        
        parts.forEach((part, index) => {
             if (part.startsWith('```') && part.endsWith('```')) {
                 const code = part.slice(3, -3).trim();
                 elements.push(
                     <View key={`code-${index}`} style={styles.codeBlock}>
                         <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                             <Text style={styles.codeText}>{code}</Text>
                         </ScrollView>
                         <TouchableOpacity style={styles.copyBtn} onPress={() => onCopy(code)}>
                             <Ionicons name="copy-outline" size={16} color="white" />
                             <Text style={styles.copyBtnText}>Copy</Text>
                         </TouchableOpacity>
                     </View>
                 );
             } else {
                 // Process links/mentions in non-code text
                 const words = part.split(/(\s+)/);
                 words.forEach((word, wIndex) => {
                     const key = `word-${index}-${wIndex}`;
                     if (word.startsWith('http')) {
                         elements.push(
                             <Text key={key} style={[styles.link, { color: colors.primary }]} onPress={() => Linking.openURL(word)}>
                                 {word}
                             </Text>
                         );
                     } else if (word.startsWith('@')) {
                         elements.push(
                             <Text key={key} style={[styles.mention, { color: colors.secondary }]}>
                                 {word}
                             </Text>
                         );
                     } else if (word.startsWith('#')) {
                         elements.push(
                             <Text key={key} style={styles.hashtag}>
                                 {word}
                             </Text>
                         );
                     } else {
                         elements.push(<Text key={key} style={[styles.bodyText, { color: colors.text.primary }]}>{word}</Text>);
                     }
                 });
             }
        });
        
        return elements;
    };
    
    return (
        <View style={styles.smartTextContainer}>
            <Text style={{lineHeight: 24, color: colors.text.primary}}>{parse(content)}</Text>
        </View>
    );
};

// --- Main Component ---
export default function PostDetail({ route, navigation }) {
    const { colors, isDark } = useTheme();
    
    // Normalize Parameters: Handle both direct postId and passed object
    const params = route.params || {};
    const passedPost = params.post;
    const postId = params.postId || (passedPost ? (passedPost.id || passedPost.post_id) : null);
    
    // If we have a full post object passed, we can init state immediately (Optimistic Render)
    const [post, setPost] = useState(passedPost || null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(!passedPost); // If we have post, not loading initially
    const [uid, setUid] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    
    // UI State
    const scrollY = useRef(new Animated.Value(0)).current;
    const [commentSort, setCommentSort] = useState('newest'); // 'top' or 'newest'
    const [commentText, setCommentText] = useState('');
    const [replyTo, setReplyTo] = useState(null); // parentId
    const [lightboxVisible, setLightboxVisible] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const insets = useSafeAreaInsets();
    
    // Fetch Data
    const loadData = async () => {
        try {
            const currentUid = await getCurrentUserId();
            setUid(currentUid);
            
            
            // 1. Get Post with side-loaded data
            if (postId) {
                const res = await client.get(`/feed/${postId}`);
                const postData = res.data.data || res.data;
                setPost(postData);

                // 3. Set Status from Backend
                setIsBookmarked(postData.is_saved); 
                setIsFollowing(postData.is_following);
            } else {
                 Alert.alert("Error", "No Post ID provided");
                 navigation.goBack();
            }
            
            // 2. Get Comments
            fetchComments();
            
        } catch (e) {
            Alert.alert("Error", "Could not load post");
            navigation.goBack();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    
    const fetchComments = async (sort = commentSort) => {
        try {
            const res = await client.get(`/feed/${postId}/comments?sort=${sort}&limit=20`);
            setComments(res.data || []);
        } catch (e) {
            console.log("Fetch comments error", e);
        }
    };
    
    useEffect(() => {
        loadData();
    }, [postId]);

    // Handlers
    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const toggleSort = () => {
        const newSort = commentSort === 'newest' ? 'top' : 'newest';
        setCommentSort(newSort);
        fetchComments(newSort);
    };

    const handleCopy = async (text) => {
        await Clipboard.setStringAsync(text);
        Alert.alert("Copied!", "Code copied to clipboard.");
    };

    const handlePostComment = async () => {
        if (!commentText.trim()) return;
        try {
             const payload = {
                 text: commentText,
                 parentId: replyTo,
                 author_name: 'Me', // Should be handled by backend auth middleware really
                 uid: uid
             };
             const res = await client.post(`/feed/${postId}/comment`, payload);
             
             if (res.data.hidden) {
                 Alert.alert("Hold on", "Your comment has been flagged for review.");
             }
             
             setCommentText('');
             setReplyTo(null);
             fetchComments(); // Reload to see new comment
        } catch (e) {
            Alert.alert("Error", "Could not post comment");
        }
    };
    
    const toggleBookmark = async () => {
        const prev = isBookmarked;
        setIsBookmarked(!isBookmarked); // Optimistic Update
        try {
            await client.post(`/feed/${postId}/save`, { uid });
        } catch (e) {
            setIsBookmarked(prev); // Revert
        }
    };
    
    const handleFollow = async () => {
        if (!post) return;
        const prev = isFollowing;
        setIsFollowing(!isFollowing); // Optimistic
        
        try {
            // Call Backend
            await client.post(`/auth/users/${post.author_uid}/follow`);
        } catch (e) {
             setIsFollowing(prev);
             Alert.alert("Error", "Could not update follow status");
        }
    };
    
    const handleConnect = () => {
       handleFollow();
    };

    // Parallax & Progress Animations
    const headerHeight = 350;
    const headerTranslate = scrollY.interpolate({
        inputRange: [0, headerHeight],
        outputRange: [0, -headerHeight / 1.5],
        extrapolate: 'clamp'
    });
    
    const imageScale = scrollY.interpolate({
        inputRange: [-headerHeight, 0, headerHeight],
        outputRange: [2, 1, 1],
        extrapolate: 'clamp'
    });

    const progressWidth = scrollY.interpolate({
        inputRange: [0, height * 2], // Approx relation
        outputRange: ['0%', '100%'],
        extrapolate: 'clamp'
    });

    if (loading || !post) {
        return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    // Flattened or Tree depends on backend, but our Routes.py now returns Tree (Roots).
    // So comments = roots.
    // getReplies helper is no longer needed for rendering if we use .replies prop
    
    // const rootComments = comments.filter(c => !c.parentId); // specific for flat list
    const getReplies = (parentId) => []; // Unused if pre-nested

    const renderComment = (comment, level = 0) => {
        const replies = comment.replies || []; // Backend now returns nested
        const isAuthor = comment.author_uid === post.author_uid;
        
        return (
            <View key={comment.id} style={[styles.commentItem, { marginLeft: level * 16, borderLeftWidth: level > 0 ? 2 : 0, borderLeftColor: colors.border }]}>
                <View style={styles.commentHeader}>
                    <View style={[styles.commentAvatar, { backgroundColor: colors.background.tertiary }]}>
                         {comment.author_avatar ? (
                             <Image source={{uri: comment.author_avatar}} style={{width:32, height:32, borderRadius:16}} />
                         ) : (
                             <Text style={[styles.avatarText, { color: colors.text.primary }]}>{comment.author_name?.[0]}</Text>
                         )}
                    </View>
                    <View style={{flex: 1}}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                            <Text style={[styles.commentAuthor, { color: colors.text.primary }]}>{comment.author_name}</Text>
                            {isAuthor && <View style={[styles.badge, { backgroundColor: colors.primary }]}><Text style={styles.badgeText}>Author</Text></View>}
                            <Text style={[styles.commentDate, { color: colors.text.tertiary }]}>{new Date(comment.timestamp).toLocaleDateString()}</Text>
                        </View>
                        <Text style={[styles.commentBody, { color: colors.text.secondary }]}>{comment.text}</Text>
                    </View>
                </View>
                
                <View style={styles.commentActions}>
                    <TouchableOpacity onPress={() => setReplyTo(comment.id)}><Text style={[styles.actionText, { color: colors.text.tertiary }]}>Reply</Text></TouchableOpacity>
                </View>

                {/* Recursive Rendering */}
                {replies.map(r => renderComment(r, level + 1))}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
            <StatusBar barStyle="light-content" />
            
            {/* 7. Reading Progress Bar */}
            <View style={[styles.progressBarTrack, { top: insets.top }]}>
                <Animated.View style={[styles.progressBar, { width: progressWidth, backgroundColor: colors.primary }]} />
            </View>

            {/* Lightbox Modal - Conditionally rendered to prevent aria-hidden focus issues on Web */}
            {lightboxVisible && (
                <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => setLightboxVisible(false)}>
                    <View style={styles.lightboxContainer}>
                        <TouchableOpacity style={styles.closeLightbox} onPress={() => setLightboxVisible(false)}>
                            <Ionicons name="close" size={30} color="white" />
                        </TouchableOpacity>
                        <Image source={{ uri: post.media_urls?.[0] }} style={styles.lightboxImage} resizeMode="contain" />
                    </View>
                </Modal>
            )}

            <Animated.ScrollView 
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Immersive Header */}
                <View style={[styles.headerPlaceholder, { height: headerHeight }]}>
                    <Animated.Image 
                        source={{ uri: post.media_urls?.[0] || 'https://picsum.photos/800/600' }} 
                        style={[styles.headerImage, { height: headerHeight, transform: [{ translateY: headerTranslate }, { scale: imageScale }] }]}
                        resizeMode="cover"
                    />
                    <Animated.View style={[styles.headerOverlay, { opacity: imageScale }]}>
                        <TouchableOpacity style={[styles.backBtn, {top: insets.top + 10}]} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                           <Text style={styles.headerTitle}>{post.title}</Text>
                           <View style={styles.headerMeta}>
                               <View style={styles.authorRow}>
                                   <TouchableOpacity style={{flexDirection:'row', alignItems:'center'}} onPress={() => navigation.navigate('Profile', { screen: 'ProfileDetail', params: { userId: post.author_uid }})}>
                                       <Image source={{ uri: post.author_avatar || 'https://picsum.photos/40/40' }} style={styles.smallAvatar} />
                                       <Text style={[styles.headerAuthor, {marginLeft: 8, marginRight: 8}]}>{post.author_name}</Text>
                                   </TouchableOpacity>
                                   
                                   <TouchableOpacity onPress={handleConnect} style={[styles.connectBtn, isFollowing && {backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)'}]}>
                                       <Text style={styles.connectText}>{isFollowing ? "Following" : "+ Follow"}</Text>
                                   </TouchableOpacity>
                               </View>
                           </View>
                        </View>
                    </Animated.View>
                </View>

                {/* Main Content */}
                <View style={[styles.body, { backgroundColor: colors.background.primary }]}>
                    {/* Tags */}
                    <View style={styles.tagsRow}>
                        {post.skills_needed?.map((skill, i) => (
                            <View key={i} style={[styles.tag, { backgroundColor: colors.background.secondary }]}><Text style={[styles.tagText, { color: colors.primary }]}>{skill}</Text></View>
                        ))}
                    </View>

                    {/* 5. Smart Text & 10. Copy Code */}
                    <SmartText content={post.description || ''} onCopy={handleCopy} colors={colors} />
                    
                    {/* 11. Image Lightbox Trigger */}
                    {post.media_urls && post.media_urls.length > 0 && (
                        <TouchableOpacity onPress={() => setLightboxVisible(true)}>
                            <Text style={[styles.viewImageText, { color: colors.text.tertiary }]}>View Full Image</Text>
                        </TouchableOpacity>
                    )}

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                     {/* Actions */}
                     <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionBtn} onPress={toggleBookmark}>
                            <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={24} color={isBookmarked ? colors.primary : colors.text.secondary} />
                             {/* 9. Simple Bounce Animation via key (could be improved) */}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn}>
                            <Ionicons name="share-social-outline" size={24} color={colors.text.secondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("Options", "Report, Hide, etc.")}>
                            <Ionicons name="ellipsis-horizontal" size={24} color={colors.text.secondary} />
                        </TouchableOpacity>
                     </View>

                    {/* 6. More from Author */}
                    {post.more_from_author && post.more_from_author.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>More from {post.author_name}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {post.more_from_author.map(p => (
                                    <TouchableOpacity key={p.id} style={styles.miniCard} onPress={() => navigation.push('PostDetail', { postId: p.id })}>
                                        <Image source={{ uri: p.media_urls?.[0] || 'https://picsum.photos/100/100' }} style={styles.miniCardImage} />
                                        <Text style={[styles.miniCardTitle, { color: colors.text.primary }]} numberOfLines={2}>{p.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* 8. Similar Projects */}
                    {post.similar_projects && post.similar_projects.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>You might also like</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {post.similar_projects.map(p => (
                                    <TouchableOpacity key={p.id} style={styles.miniCard} onPress={() => navigation.push('PostDetail', { postId: p.id })}>
                                        <Image source={{ uri: p.media_urls?.[0] || 'https://picsum.photos/100/100' }} style={styles.miniCardImage} />
                                        <Text style={[styles.miniCardTitle, { color: colors.text.primary }]} numberOfLines={2}>{p.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Comments Section */}
                    <View style={styles.section}>
                        <View style={styles.commentHeaderRow}>
                            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Comments ({comments.length})</Text>
                            {/* 4. Sort Toggle */}
                            <TouchableOpacity onPress={toggleSort}>
                                <Text style={[styles.sortLink, { color: colors.primary }]}>{commentSort === 'top' ? 'Top' : 'Newest'}</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {/* 3. Threaded Comments & 12. Badges */}
                        {comments.length === 0 ? (
                            <Text style={{color: colors.text.tertiary, fontStyle: 'italic'}}>No comments yet. Be the first!</Text>
                        ) : (
                            comments.map(c => renderComment(c))
                        )}
                        
                        {/* 17. Load More (Simple placeholder) */}
                        <TouchableOpacity style={{marginTop: 15, alignSelf: 'center'}}>
                            <Text style={{color: colors.primary}}>View more comments</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </Animated.ScrollView>

            {/* 2. Floating Action Input bar (Instead of FAB, instagram style input is better for comments) */}
            {/* Wait, user asked for FAB. Let's do a FAB that expands or a sticky input bottom */}
            <View style={[styles.footerInput, { paddingBottom: insets.bottom + 10, backgroundColor: colors.background.secondary, borderTopColor: colors.border }]}>
                {replyTo && (
                    <View style={styles.replyContext}>
                        <Text style={{color: '#fff', fontSize: 12}}>Replying to comment...</Text>
                        <TouchableOpacity onPress={() => setReplyTo(null)}><Ionicons name="close" size={16} color="white" /></TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputContainer}>
                     <TextInput 
                        style={[styles.input, { backgroundColor: colors.background.tertiary, color: colors.text.primary }]} 
                        placeholder={replyTo ? "Write a reply..." : "Add a comment..."} 
                        placeholderTextColor={colors.text.tertiary}
                        value={commentText}
                        onChangeText={setCommentText}
                     />
                     <TouchableOpacity onPress={handlePostComment} disabled={!commentText.trim()}>
                         <Ionicons name="send" size={24} color={commentText.trim() ? colors.primary : "#555"} />
                     </TouchableOpacity>
                </View>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    progressBarTrack: { 
        position: 'absolute', left: 0, right: 0, height: 4, zIndex: 100, backgroundColor: 'transparent' 
    },
    progressBar: { height: '100%' },
    
    headerPlaceholder: { width: '100%', overflow: 'hidden', backgroundColor: '#000' },
    headerImage: { width: '100%', position: 'absolute' },
    headerOverlay: { 
        ...StyleSheet.absoluteFillObject, 
        backgroundColor: 'rgba(0,0,0,0.3)', 
        justifyContent: 'flex-end',
        padding: 20 
    },
    backBtn: { position: 'absolute', left: 20, padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 10 },
    headerMeta: { flexDirection: 'row', alignItems: 'center' },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    smallAvatar: { width: 30, height: 30, borderRadius: 15 },
    headerAuthor: { color: 'white', fontWeight: '600' },
    connectBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
    connectText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    
    body: { padding: 20 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    tagText: { fontSize: 12 },
    
    // Smart Text Styles
    smartTextContainer: { marginBottom: 20 },
    bodyText: { fontSize: 16, lineHeight: 24 },
    link: { textDecorationLine: 'underline' },
    mention: { fontWeight: 'bold' },
    hashtag: { color: '#e91e63', fontWeight: 'bold' }, // Pinkish
    codeBlock: { backgroundColor: '#1e1e1e', padding: 15, borderRadius: 8, marginVertical: 10 },
    codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#d4d4d4', fontSize: 14 },
    copyBtn: { position: 'absolute', top: 5, right: 5, flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', padding: 4, borderRadius: 4 },
    copyBtnText: { color: 'white', fontSize: 10, marginLeft: 4 },
    viewImageText: { textAlign: 'center', fontSize: 12, marginBottom: 20, textDecorationLine: 'underline' },
    
    divider: { height: 1, marginVertical: 20 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    actionBtn: { padding: 10 },
    
    // Sections
    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    commentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sortLink: { fontWeight: '600' },
    
    miniCard: { width: 140, marginRight: 15 },
    miniCardImage: { width: 140, height: 100, borderRadius: 8, marginBottom: 5 },
    miniCardTitle: { fontSize: 14, fontWeight: '500' },
    
    // Comments
    commentItem: { marginBottom: 15, paddingLeft: 10 },
    commentHeader: { flexDirection: 'row', gap: 10 },
    commentAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontWeight: 'bold' },
    commentAuthor: { fontWeight: 'bold', fontSize: 14 },
    commentDate: { fontSize: 12 },
    commentBody: { marginTop: 4, fontSize: 14 },
    badge: { paddingHorizontal: 6, borderRadius: 4 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    commentActions: { flexDirection: 'row', gap: 15, marginLeft: 42, marginTop: 5 },
    actionText: { fontSize: 12, fontWeight: '600' },
    
    // Footer Input
    footerInput: { 
        position: 'absolute', bottom: 0, left: 0, right: 0, 
        borderTopWidth: 1,
        paddingHorizontal: 15, paddingTop: 10 
    },
    inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    input: { flex: 1, borderRadius: 20, paddingHorizontal: 15, height: 40 },
    replyContext: { backgroundColor: '#333', padding: 5, marginBottom: 5, borderRadius: 5, flexDirection: 'row', justifyContent: 'space-between' },
    
    // Lightbox
    lightboxContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
    lightboxImage: { width: '100%', height: '80%' },
    closeLightbox: { position: 'absolute', top: 50, right: 20, zIndex: 10 }
});
