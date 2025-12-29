import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, RefreshControl, Dimensions, StatusBar, Alert, Modal, Linking, Animated, Platform, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur'; // If available, otherwise we simulate transparency
import client from '../../../core/api/client';
import { getCurrentUserId, signOut } from '../../../core/auth';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../../../core/design/Theme';
import { FeedSkeleton } from '../../../core/widgets/SkeletonLoader';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 180;

// --- Feature Components ---

const LevelModal = ({ visible, onClose, stats }) => {
    const xp = (stats.posts * 10) + (stats.followers * 5) + (stats.following * 2);
    const nextLevelXp = 500; // Mock threshold
    const progress = Math.min(xp / nextLevelXp, 1);
    
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, { alignItems: 'center' }]}>
                    <Text style={{fontSize: 22, fontWeight: 'bold', marginBottom: 10}}>Level Progress</Text>
                    <View style={styles.levelIconContainer}>
                         <Text style={{fontSize: 40}}>🏆</Text>
                    </View>
                    <Text style={{fontSize: 18, fontWeight: '600', color: COLORS.primary, marginBottom: 5}}>Current: Campus Legend</Text>
                    <Text style={{color: '#666', marginBottom: 20}}>750 XP / 1000 XP</Text>
                    
                    <View style={{width: '100%', height: 10, backgroundColor: '#eee', borderRadius: 5, marginBottom: 10}}>
                         <View style={{width: '75%', height: '100%', backgroundColor: COLORS.warning, borderRadius: 5}} />
                    </View>
                    <Text style={{color: '#888', fontSize: 12, marginBottom: 20}}>Earn 250 more XP to reach "Campus God" status!</Text>
                    
                    <TouchableOpacity onPress={onClose} style={styles.primaryBtn}>
                        <Text style={styles.primaryBtnText}>Keep Grinding</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const InsightsCard = ({ visible }) => {
    if (!visible) return null;
    return (
        <View style={styles.insightsCard}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                <Text style={{fontWeight: 'bold', fontSize: 16}}>Private Insights 🔒</Text>
                <Text style={{color: COLORS.success, fontSize: 12}}>+12% this week</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                 <View style={styles.insightItem}>
                     <Text style={styles.insightVal}>42</Text>
                     <Text style={styles.insightLbl}>Profile Views</Text>
                 </View>
                 <View style={styles.insightItem}>
                     <Text style={styles.insightVal}>1.2k</Text>
                     <Text style={styles.insightLbl}>Post Impressions</Text>
                 </View>
                 <View style={styles.insightItem}>
                     <Text style={styles.insightVal}>8</Text>
                     <Text style={styles.insightLbl}>New Connects</Text>
                 </View>
            </View>
        </View>
    )
}

const SkillBadge = ({ skill, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.skillBadge}>
        <Text style={styles.skillText}>{skill}</Text>
        <MaterialCommunityIcons name="check-decagram" size={14} color={COLORS.primary} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
);

const Heatmap = () => {
    // Mock heatmap visualization
    const days = Array.from({ length: 50 }, (_, i) => ({
        level: Math.random() > 0.7 ? 2 : Math.random() > 0.4 ? 1 : 0
    }));
    return (
        <View style={styles.heatmapContainer}>
            <Text style={styles.sectionTitleSmall}>Contribution Graph</Text>
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

const FeaturedProject = ({ project, onPress }) => {
    if(!project) return null;
    return (
        <View style={{marginBottom: 20}}>
            <Text style={styles.sectionTitleSmall}>📌 Pinned Project</Text>
            <TouchableOpacity style={styles.featuredCard} onPress={onPress}>
                <Image source={{uri: project.image || 'https://picsum.photos/400/200'}} style={styles.featuredImg} />
                <View style={styles.featuredOverlay}>
                    <Text style={styles.featuredTitle}>{project.title || "AI Campus Assistant"}</Text>
                    <Text style={styles.featuredDesc}>{project.desc || "An automated agent for students."}</Text>
                </View>
            </TouchableOpacity>
        </View>
    )
}

// --- Main Screen ---

export default function ProfileScreen({ navigation }) {
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uid, setUid] = useState(null);
    const [activeTab, setActiveTab] = useState('Posts'); 
    const [showQr, setShowQr] = useState(false);
    const [showLevel, setShowLevel] = useState(false);
    const [expandedBio, setExpandedBio] = useState(false);
    
    // Animation
    const scrollY = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        React.useCallback(() => {
            loadData();
            return () => { setRefreshing(false); };
        }, [])
    );

    const loadData = async () => {
        try {
            const currentUid = await getCurrentUserId();
            setUid(currentUid);
            if (!currentUid) {
                setLoading(false);
                return;
            };

            const res = await client.get(`/profile/${currentUid}`);
            setProfile(res.data);

            try {
                const f = await client.get(`/social/followers/${currentUid}`);
                const fo = await client.get(`/social/following/${currentUid}`);
                const postsRes = await client.get(`/feed?author_uid=${currentUid}`);

                setStats({
                    followers: res.data.followers_count ?? (f.data || []).length,
                    following: res.data.following_count ?? (fo.data || []).length,
                    posts: (postsRes.data || []).length
                });
                const postsData = postsRes.data;
                const safePosts = Array.isArray(postsData) ? postsData : (postsData?.data || []);
                setPosts(Array.isArray(safePosts) ? safePosts : []);
            } catch (ignore) { }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: async () => {
                await signOut();
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }}
        ]);
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
    const coverUrl = profile?.cover_url || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80'; // Mock/Default Cover

    // Parallax logic
    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, HEADER_HEIGHT],
        outputRange: [0, -HEADER_HEIGHT],
        extrapolate: 'clamp',
    });
    
    const imageScale = scrollY.interpolate({
        inputRange: [-100, 0],
        outputRange: [1.5, 1],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Parallax Header Background */}
            <Animated.View style={[styles.coverContainer, { transform: [{translateY: headerTranslateY}, {scale: imageScale}] }]}>
                 <ImageBackground source={{uri: coverUrl}} style={styles.coverImage}>
                     <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.coverGradient} />
                 </ImageBackground>
            </Animated.View>

            {/* Float Header Controls */}
            <SafeAreaView style={styles.floatHeader} edges={['top']}>
                <TouchableOpacity style={styles.glassBtn} onPress={() => setShowQr(true)}>
                    <Ionicons name="qr-code" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.glassBtn} onPress={() => navigation.navigate('Settings')}>
                    <Ionicons name="settings-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </SafeAreaView>

            <Animated.ScrollView
                style={{flex: 1}}
                contentContainerStyle={{paddingTop: HEADER_HEIGHT - 30, paddingBottom: 40}}
                onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {useNativeDriver: true})}
                scrollEventThrottle={16}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#fff" />}
            >
                {/* Profile Card Layer */}
                <View style={styles.profileLayer}>
                    {/* Avatar & Basic Info */}
                    <View style={styles.headerContent}>
                        <View style={styles.avatarWrapper}>
                           <Image source={{ uri: avatarUrl || 'https://picsum.photos/100/100' }} style={styles.avatar} />
                           <View style={styles.onlineBadge} />
                        </View>
                        
                        <Text style={styles.name}>{profile?.name || 'User'}</Text>
                        <TouchableOpacity onPress={() => setShowLevel(true)}>
                            <Text style={styles.levelBadge}>{getLevel()} <Ionicons name="chevron-forward" size={12} /></Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setExpandedBio(!expandedBio)}>
                            <Text style={styles.bio} numberOfLines={expandedBio ? undefined : 2}>
                                {profile?.bio || 'Campus enthusiast. Building things and meeting people.'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Stats Glass Row */}
                    <View style={styles.statsContainer}>
                        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('ProfileDetail', { userId: uid })}>
                            <Text style={styles.statVal}>{stats.posts}</Text>
                            <Text style={styles.statLbl}>Posts</Text>
                        </TouchableOpacity>
                         <View style={styles.statDivider} />
                        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowList', { type: 'followers', userId: uid })}>
                            <Text style={styles.statVal}>{stats.followers}</Text>
                            <Text style={styles.statLbl}>Followers</Text>
                        </TouchableOpacity>
                         <View style={styles.statDivider} />
                        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowList', { type: 'following', userId: uid })}>
                            <Text style={styles.statVal}>{stats.following}</Text>
                            <Text style={styles.statLbl}>Following</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Insights (Private) */}
                    <View style={{paddingHorizontal: 20, marginBottom: 20}}>
                        <InsightsCard visible={true} />
                    </View>

                    {/* Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.mainBtn} onPress={() => navigation.navigate('EditProfile', { profile })}>
                            <Text style={styles.mainBtnText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(profile?.github_link || 'https://github.com')}>
                            <Ionicons name="logo-github" size={22} color="#000" />
                        </TouchableOpacity>
                         <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Bookmarks')}>
                            <Ionicons name="bookmark-outline" size={22} color="#000" />
                        </TouchableOpacity>
                    </View>

                    {/* Featured Project */}
                    <View style={{paddingHorizontal: 20}}>
                        <FeaturedProject />
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabsRow}>
                        {['Posts', 'Media', 'About'].map(t => (
                            <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={[styles.tabBtn, activeTab === t && styles.tabActive]}>
                                <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Grid Content */}
                     <View style={styles.contentArea}>
                         {activeTab === 'Posts' && (
                             <View style={styles.grid}>
                                 {posts.map((p, i) => (
                                     <TouchableOpacity key={i} style={styles.gridItem}>
                                         <Image source={{uri: p.media_urls?.[0] || `https://picsum.photos/200?random=${i}`}} style={styles.gridImage} />
                                     </TouchableOpacity>
                                 ))}
                                 {/* Example blanks for layout */}
                                 {posts.length < 9 && Array.from({length: 9 - posts.length}).map((_, i) => (
                                      <View key={`b-${i}`} style={[styles.gridItem, {backgroundColor: '#f0f0f0'}]} />
                                 ))}
                             </View>
                         )}
                         {activeTab === 'About' && (
                             <View style={{padding: 20}}>
                                 <Text style={styles.sectionTitleSmall}>Skills</Text>
                                 <View style={{flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 20}}>
                                     {(profile?.skills || ['React Native', 'Python', 'UX Design', 'Leadership']).map(s => (
                                         <SkillBadge key={s} skill={s} onPress={() => Alert.alert(s, "Endorsed by 5 people")} />
                                     ))}
                                 </View>
                                 <Heatmap />
                             </View>
                         )}
                     </View>

                </View>
            </Animated.ScrollView>

            <LevelModal visible={showLevel} onClose={() => setShowLevel(false)} stats={stats} />
            
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

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    coverContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT + 50,
        zIndex: 0,
    },
    coverImage: { width: '100%', height: '100%' },
    coverGradient: { position: 'absolute', bottom: 0, width: '100%', height: 100 },
    
    floatHeader: {
        flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20,
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    },
    glassBtn: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)',
    },

    profileLayer: {
        backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
        minHeight: 800, paddingBottom: 50,
    },
    headerContent: { alignItems: 'center', marginTop: -50 },
    avatarWrapper: {
        padding: 4, backgroundColor: '#fff', borderRadius: 60, elevation: 5,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
    },
    avatar: { width: 110, height: 110, borderRadius: 55 },
    onlineBadge: {
        position: 'absolute', bottom: 10, right: 10, width: 20, height: 20,
        backgroundColor: COLORS.success, borderRadius: 10, borderWidth: 3, borderColor: '#fff'
    },
    
    name: { fontSize: 24, fontWeight: '800', marginTop: 10, color: '#000' },
    levelBadge: { color: COLORS.primary, fontWeight: 'bold', marginTop: 4, backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
    bio: { textAlign: 'center', paddingHorizontal: 40, marginTop: 12, color: '#666', lineHeight: 20 },

    statsContainer: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        marginVertical: 24, marginHorizontal: 20, paddingVertical: 15,
        backgroundColor: '#fff', borderRadius: 20,
        shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
        borderWidth: 1, borderColor: '#f0f0f0'
    },
    statItem: { alignItems: 'center', flex: 1 },
    statDivider: { width: 1, height: 30, backgroundColor: '#eee' },
    statVal: { fontSize: 18, fontWeight: 'bold', color: '#000' },
    statLbl: { fontSize: 12, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

    insightsCard: {
        backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#eff6ff'
    },
    insightItem: { alignItems: 'center' },
    insightVal: { fontWeight: 'bold', fontSize: 16 },
    insightLbl: { fontSize: 11, color: '#64748B' },

    actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 30, paddingHorizontal: 20 },
    mainBtn: {
        backgroundColor: '#000', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 30, flex: 1, alignItems: 'center',
        shadowColor: COLORS.primary, shadowOffset: {width:0,height:4}, shadowOpacity: 0.2, shadowRadius: 8
    },
    mainBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    iconBtn: {
        width: 50, height: 50, borderRadius: 25, backgroundColor: '#f5f5f5',
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee'
    },

    featuredCard: {
        height: 160, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000', marginTop: 10
    },
    featuredImg: { width: '100%', height: '100%', opacity: 0.8 },
    featuredOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: 15,
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    featuredTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    featuredDesc: { color: '#ddd', fontSize: 12 },

    tabsRow: {
        flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', marginTop: 10
    },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 16 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#000' },
    tabText: { fontWeight: '600', color: '#999' },
    tabTextActive: { color: '#000' },

    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    gridItem: { width: width / 3, height: width / 3, padding: 0.5 },
    gridImage: { width: '100%', height: '100%' },

    sectionTitleSmall: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
    skillBadge: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor:'#DCFCE7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection:'row', alignItems:'center' },
    skillText: { color: '#166534', fontWeight: '600', fontSize: 12 },
    
    heatmapContainer: { marginTop: 10 },
    heatmapGrid: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
    heatmapBox: { width: 14, height: 14, borderRadius: 4 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalCard: { width: '85%', backgroundColor: '#fff', borderRadius: 24, padding: 24 },
    primaryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 20, marginTop: 10 },
    primaryBtnText: { color: '#fff', fontWeight: 'bold' },
    
    qrCard: { width: 300, backgroundColor: 'white', borderRadius: 20, padding: 30, alignItems: 'center' },
    qrTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    qrPlaceholder: { padding: 10, borderColor: '#eee', borderWidth: 2, borderRadius: 10, marginBottom: 20 },
    qrName: { fontSize: 18, fontWeight: '600', marginBottom: 20 },
    closeQrBtn: { paddingVertical: 10, paddingHorizontal: 30, backgroundColor: '#f5f5f5', borderRadius: 20 },
    closeQrText: { fontWeight: 'bold' },
});
