
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, RefreshControl, Dimensions, StatusBar, Alert, Modal, Linking, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import client from '../../../core/api/client';
import { getCurrentUserId, signOut } from '../../../core/auth';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../../../core/design/Theme';
import { FeedSkeleton } from '../../../core/widgets/SkeletonLoader';

const { width } = Dimensions.get('window');

// --- Feature Components ---

const ProgressBar = ({ progress }) => (
    <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress * 100)}% Profile Complete</Text>
    </View>
);

const SkillBadge = ({ skill }) => (
    <View style={styles.skillBadge}>
        <Text style={styles.skillText}>{skill}</Text>
        <MaterialCommunityIcons name="check-decagram" size={14} color={COLORS.primary} style={{marginLeft: 4}} />
    </View>
);

const SocialLink = ({ icon, color, url, label }) => {
    if (!url) return null;
    return (
        <TouchableOpacity style={[styles.socialBtn, { borderColor: color }]} onPress={() => Linking.openURL(url).catch(e => console.log(e))}>
            <Ionicons name={icon} size={20} color={color} />
        </TouchableOpacity>
    );
};

const Heatmap = () => {
    // Mock heatmap visualization
    const days = Array.from({ length: 50 }, (_, i) => ({
        level: Math.random() > 0.7 ? 2 : Math.random() > 0.4 ? 1 : 0
    }));
    return (
        <View style={styles.heatmapContainer}>
            <Text style={styles.sectionTitleSmall}>Activity (Last 50 Days)</Text>
            <View style={styles.heatmapGrid}>
                {days.map((d, i) => (
                    <View key={i} style={[styles.heatmapBox, { 
                        backgroundColor: d.level === 2 ? COLORS.primary : d.level === 1 ? '#93C5FD' : '#E5E7EB' 
                    }]} />
                ))}
            </View>
        </View>
    );
}

const TabButton = ({ title, isActive, onPress }) => (
    <TouchableOpacity style={[styles.tabBtn, isActive && styles.tabBtnActive]} onPress={onPress}>
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
);

// --- Main Screen ---

export default function ProfileScreen({ navigation }) {
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uid, setUid] = useState(null);
    const [activeTab, setActiveTab] = useState('Posts'); // Posts, Media, About
    const [showQr, setShowQr] = useState(false);

    useEffect(() => { 
        loadData();
        // Safety timeout
        const timer = setTimeout(() => setLoading(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    const loadData = async () => {
        try {
            const currentUid = await getCurrentUserId();
            setUid(currentUid);
            if (!currentUid) {
                setLoading(false);
                return;
            };

            const res = await client.get(`/auth/profile?uid=${currentUid}`);
            setProfile(res.data.profile);

            try {
                const f = await client.get(`/social/followers/${currentUid}`);
                const fo = await client.get(`/social/following/${currentUid}`);
                const p = await client.get(`/feed?author=${currentUid}`);
                setStats({
                    followers: (f.data || []).length,
                    following: (fo.data || []).length,
                    posts: (p.data || []).length
                });
                const postsData = p.data;
                const safePosts = Array.isArray(postsData) ? postsData : (postsData?.data || []);
                setPosts(Array.isArray(safePosts) ? safePosts : []);
            } catch (ignore) {}

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to log out?")) performLogout();
        } else {
             Alert.alert("Log Out", "Are you sure you want to log out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: performLogout }
            ]);
        }
    };

    const performLogout = async () => {
        await signOut();
         navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }

    // Calculations
    const completionRate = () => {
        if (!profile) return 0;
        let score = 0;
        if (profile.name) score += 20;
        if (profile.bio) score += 20;
        if (profile.avatar_url) score += 20;
        if (profile.skills && profile.skills.length > 0) score += 20;
        if (profile.github_link || profile.resume_url) score += 20;
        return score / 100;
    };

    const getLevel = () => {
        const pCount = stats.posts;
        if (pCount > 50) return "Campus Legend 🏆";
        if (pCount > 20) return "Senior 🎓";
        if (pCount > 5) return "Sophomore 📚";
        return "Freshman 🌱";
    };

    if (loading && !refreshing) return <SafeAreaView style={styles.container}><FeedSkeleton /></SafeAreaView>;

    const avatarUrl = profile?.avatar_url;
    const isDefaultAvatar = !avatarUrl;
    
    // Initials
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setShowQr(true)}>
                    <Ionicons name="qr-code-outline" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{profile?.username || 'Profile'}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                    <Ionicons name="settings-outline" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            <ScrollView 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Profile Header Card */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                         {isDefaultAvatar ? (
                            <View style={styles.defaultAvatar}>
                                <Text style={styles.defaultAvatarText}>{getInitials(profile?.name || 'User')}</Text>
                            </View>
                        ) : (
                             <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        )}
                        <View style={styles.statusBadge}>
                             <Text style={{fontSize: 10}}>💻 Coding</Text>
                        </View>
                    </View>
                    
                    <Text style={styles.name}>{profile?.name || 'User'}</Text>
                    <Text style={styles.levelBadge}>{getLevel()}</Text>
                    <Text style={styles.bio}>{profile?.bio || 'No bio yet.'}</Text>
                    
                    <View style={styles.statsRow}>
                        <View style={styles.stat}><Text style={styles.statNum}>{stats.posts}</Text><Text style={styles.statLbl}>Posts</Text></View>
                        <View style={styles.stat}><Text style={styles.statNum}>{stats.followers}</Text><Text style={styles.statLbl}>Followers</Text></View>
                        <View style={styles.stat}><Text style={styles.statNum}>{stats.following}</Text><Text style={styles.statLbl}>Following</Text></View>
                    </View>

                    <ProgressBar progress={completionRate()} />

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile', { profile })}>
                            <Text style={styles.editBtnText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Bookmarks')}>
                            <Ionicons name="bookmark-outline" size={22} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* Social Links */}
                    <View style={styles.socialRow}>
                        {profile?.github_link && <SocialLink icon="logo-github" color="#333" url={profile.github_link} />}
                        {profile?.resume_url && <SocialLink icon="document-text-outline" color="#007AFF" url={profile.resume_url} />}
                        {/* Mocked extra links for demo if profile data missing */}
                        <SocialLink icon="logo-linkedin" color="#0077B5" url="https://linkedin.com" />
                        <SocialLink icon="logo-twitter" color="#1DA1F2" url="https://twitter.com" />
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TabButton title="Posts" isActive={activeTab === 'Posts'} onPress={() => setActiveTab('Posts')} />
                    <TabButton title="Media" isActive={activeTab === 'Media'} onPress={() => setActiveTab('Media')} />
                    <TabButton title="About" isActive={activeTab === 'About'} onPress={() => setActiveTab('About')} />
                </View>

                {/* Tab Content */}
                <View style={styles.tabContent}>
                    {activeTab === 'Posts' && (
                        <View style={styles.postsGrid}>
                            {posts.map(post => (
                                <TouchableOpacity key={post.id} style={styles.gridItem} onPress={() => navigation.navigate('ProfileDetail', { userId: uid })}>
                                    <Image source={{ uri: post.media_urls?.[0] || 'https://picsum.photos/150/150' }} style={styles.gridImage} />
                                </TouchableOpacity>
                            ))}
                            {posts.length === 0 && <Text style={styles.emptyText}>No posts yet.</Text>}
                        </View>
                    )}

                    {activeTab === 'Media' && (
                        <View style={styles.mediaGrid}>
                             {/* Mock Media Gallery */}
                             <View style={styles.mediaItemPlaceholder}><Ionicons name="play-circle-outline" size={32} color="#ccc"/></View>
                             <View style={styles.mediaItemPlaceholder}><Ionicons name="image-outline" size={32} color="#ccc"/></View>
                             <View style={styles.mediaItemPlaceholder}><Ionicons name="videocam-outline" size={32} color="#ccc"/></View>
                        </View>
                    )}

                    {activeTab === 'About' && (
                        <View style={styles.aboutSection}>
                             <Text style={styles.sectionTitle}>Skills</Text>
                             <View style={styles.skillsContainer}>
                                 {(profile?.skills || ['React', 'Design', 'Python']).map((s, i) => <SkillBadge key={i} skill={s} />)}
                             </View>

                             <Heatmap />
                             
                             <Text style={styles.sectionTitle}>Achievements</Text>
                             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsRow}>
                                 <View style={styles.achievementCard}>
                                     <Text style={{fontSize:24}}>🚀</Text>
                                     <Text style={styles.achTitle}>Early Adopter</Text>
                                 </View>
                                 <View style={styles.achievementCard}>
                                     <Text style={{fontSize:24}}>🔥</Text>
                                     <Text style={styles.achTitle}>10 Day Streak</Text>
                                 </View>
                                 <View style={styles.achievementCard}>
                                     <Text style={{fontSize:24}}>✍️</Text>
                                     <Text style={styles.achTitle}>First Post</Text>
                                 </View>
                             </ScrollView>
                        </View>
                    )}
                </View>
                
                <TouchableOpacity style={styles.logoutLink} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* QR Modal */}
            <Modal visible={showQr} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.qrCard}>
                        <Text style={styles.qrTitle}>Share Profile</Text>
                        <View style={styles.qrPlaceholder}>
                            <Ionicons name="qr-code" size={150} color="#000" />
                        </View>
                        <Text style={styles.qrName}>@{profile?.username || 'user'}</Text>
                        <TouchableOpacity style={styles.closeQrBtn} onPress={() => setShowQr(false)}>
                            <Text style={styles.closeQrText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    pageTitle: { fontSize: 18, fontWeight: '700' },
    
    profileHeader: { alignItems: 'center', padding: 20 },
    avatarContainer: { position: 'relative', marginBottom: 12 },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    defaultAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    defaultAvatarText: { fontSize: 36, color: 'white', fontWeight: 'bold' },
    statusBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#eee', ...SHADOWS.light },
    
    name: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
    levelBadge: { color: COLORS.primary, fontWeight: '600', marginBottom: 8, fontSize: 14 },
    bio: { color: '#666', textAlign: 'center', marginBottom: 20, paddingHorizontal: 30 },
    
    statsRow: { flexDirection: 'row', gap: 30, marginBottom: 20 },
    stat: { alignItems: 'center' },
    statNum: { fontSize: 20, fontWeight: 'bold' },
    statLbl: { color: '#888', fontSize: 12 },
    
    progressContainer: { width: '100%', marginBottom: 20 },
    progressBarBg: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginBottom: 6 },
    progressBarFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 3 },
    progressText: { fontSize: 12, color: '#888', textAlign: 'right' },
    
    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    editBtn: { backgroundColor: '#f5f5f5', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20 },
    editBtnText: { fontWeight: '600' },
    iconBtn: { backgroundColor: '#f5f5f5', padding: 10, borderRadius: 20 },
    
    socialRow: { flexDirection: 'row', gap: 16 },
    socialBtn: { padding: 8, borderWidth: 1, borderRadius: 12 },
    
    tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 15 },
    tabBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
    tabText: { fontWeight: '600', color: '#888' },
    tabTextActive: { color: COLORS.primary },
    
    tabContent: { minHeight: 300 },
    postsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    gridItem: { width: width / 3, height: width / 3, padding: 1 },
    gridImage: { width: '100%', height: '100%' },
    emptyText: { padding: 40, textAlign: 'center', color: '#888', width: '100%' },
    
    mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 1 },
    mediaItemPlaceholder: { width: width / 3 - 2, height: width / 3 - 2, backgroundColor: '#f9f9f9', margin: 1, justifyContent: 'center', alignItems: 'center' },
    
    aboutSection: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 10 },
    sectionTitleSmall: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#555' },
    skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    skillBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    skillText: { color: COLORS.primary, fontWeight: '500' },
    
    heatmapContainer: { marginBottom: 20 },
    heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
    heatmapBox: { width: 12, height: 12, borderRadius: 2 },
    
    achievementsRow: { flexDirection: 'row' },
    achievementCard: { width: 100, height: 100, backgroundColor: '#f9f9f9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    achTitle: { fontSize: 12, fontWeight: '600', marginTop: 8 },
    
    logoutLink: { alignSelf: 'center', marginTop: 30 },
    logoutText: { color: COLORS.error, fontWeight: 'bold' },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    qrCard: { width: 300, backgroundColor: 'white', borderRadius: 20, padding: 30, alignItems: 'center' },
    qrTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    qrPlaceholder: { padding: 10, borderColor: '#eee', borderWidth: 2, borderRadius: 10, marginBottom: 20 },
    qrName: { fontSize: 18, fontWeight: '600', marginBottom: 20 },
    closeQrBtn: { paddingVertical: 10, paddingHorizontal: 30, backgroundColor: '#f5f5f5', borderRadius: 20 },
    closeQrText: { fontWeight: 'bold' },
});
