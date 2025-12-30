import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, RefreshControl, Dimensions, StatusBar, Alert, Modal, Linking, Animated, Platform, ImageBackground, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur'; // If available, otherwise we simulate transparency
import client from '../../../core/api/client';
import QRCode from 'react-native-qrcode-svg';
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

const InsightsCard = ({ visible, stats }) => {
    if (!visible) return null;
    return (
        <View style={styles.insightsCard}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                <Text style={{fontWeight: 'bold', fontSize: 16}}>Private Insights 🔒</Text>
                <Text style={{color: COLORS.success, fontSize: 12}}>Real-time</Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                 <View style={styles.insightItem}>
                     <Text style={styles.insightVal}>{stats?.views || 0}</Text>
                     <Text style={styles.insightLbl}>Profile Views</Text>
                 </View>
                 <View style={styles.insightItem}>
                     <Text style={styles.insightVal}>{stats?.impressions || 0}</Text>
                     <Text style={styles.insightLbl}>Post Impressions</Text>
                 </View>
                 <View style={styles.insightItem}>
                     <Text style={styles.insightVal}>{stats?.followers || 0}</Text>
                     <Text style={styles.insightLbl}>Total Followers</Text>
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
    
    // Scanner
    const [showScanner, setShowScanner] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    const [showLevel, setShowLevel] = useState(false);
    const [expandedBio, setExpandedBio] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    
    // Animation
    const scrollY = useRef(new Animated.Value(0)).current;

    const handleBarCodeScanned = ({ type, data }) => {
        setScanned(true);
        if (data.includes('campushub://profile/')) {
            const scannedUid = data.split('/').pop();
            setShowScanner(false);
            Alert.alert("Scanned!", `Found profile: ${scannedUid}`, [
                { text: "View", onPress: () => navigation.navigate('ProfileDetail', { userId: scannedUid }) }
            ]);
        } else {
            Alert.alert("Invalid QR", "This code is not a CampusHub profile.");
            setShowScanner(false);
        }
    };

    const openScanner = () => {
        if (!permission) return;
        if (!permission.granted) {
            requestPermission().then(res => {
                if (res.granted) setShowScanner(true);
                else Alert.alert("Permission", "Camera permission is required.");
            });
        } else {
            setScanned(false);
            setShowScanner(true);
        }
    };

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

            // Use the enhanced endpoint
            const res = await client.get(`/profile/${currentUid}/enhanced`);
            const data = res.data;
            
            setProfile({
                 ...data,
                 // Provide fallback if user model structure differs slightly
                 avatar_url: data.avatar_url || data.avatar,
                 cover_url: data.cover_photo
            });
            
            // Stats from backend are now accurate
            if (data.stats) {
                setStats({
                    posts: data.stats.collaborations + (data.stats.posts || 0), // Use enhanced logic if available, or just data.stats.posts if backend provides
                    // Actually, backend 'enhanced' returns 'collaborations', maybe missing 'posts' count in simplified dict?
                    // Let's check backend route: 'stats' = {'views', 'collaborations', 'likes', 'followers', 'following', 'reputation'}
                    // It seems I missed 'posts' in the stats dict in previous step. I should trust 'collaborations' as projects count?
                    // Let's rely on posts fetched length for now if stats.posts is missing.
                    followers: data.stats.followers,
                    following: data.stats.following,
                    views: data.stats.views,
                    impressions: data.stats.impressions,
                    likes: data.stats.likes
                });
            }

            // Fetch Posts Separate or reuse?
            console.log("Fetching posts for:", currentUid);
            const postsRes = await client.get(`/feed?author_uid=${currentUid}`);
            console.log("Posts Response:", postsRes.data);
            setPosts(postsRes.data?.data || []);
            
            // Backend enhanced endpoint returns 'projects' list now
            // We can store it in profile.projects or separate state
            // Let's assume profile.projects is populated

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleShare = async () => {
        try {
            const url = `campushub://profile/${profile?.uid}`;
            await Share.share({
                message: `Check out my profile on CampusHub! ${url}`,
                url: url
            });
        } catch (error) {
            Alert.alert("Error", error.message);
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
                <View style={{flexDirection: 'row', gap: 10}}>
                    <TouchableOpacity style={styles.glassBtn} onPress={() => setShowQr(true)}>
                        <Ionicons name="qr-code-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.glassBtn} onPress={openScanner}>
                        <Ionicons name="scan-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
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
                    
                    <View style={{paddingHorizontal: 20, marginBottom: 20}}>
                        <InsightsCard visible={true} stats={stats} />
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
                        <FeaturedProject project={profile?.projects?.[0]} onPress={() => profile?.projects?.[0]?.demo_url && Linking.openURL(profile.projects[0].demo_url)} />
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabsRow}>
                        {['Posts', 'Projects', 'About'].map(t => (
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
                                     <TouchableOpacity key={i} style={styles.gridItem} onPress={() => setSelectedPost(p)}>
                                         <Image source={{uri: p.media_urls?.[0] || `https://picsum.photos/200?random=${i}`}} style={styles.gridImage} />
                                     </TouchableOpacity>
                                 ))}
                                 {posts.length === 0 && (
                                     <View style={{padding: 20, alignItems: 'center', width: '100%'}}>
                                         <Text style={{color: '#999', fontSize: 16}}>Let's post your first project/post.</Text>
                                     </View>
                                 )}
                             </View>
                         )}
                         {activeTab === 'Projects' && (
                            <View style={{padding: 20}}>
                                {(profile?.projects || []).map((proj, i) => (
                                    <TouchableOpacity key={i} style={styles.projectCard} onPress={() => Linking.openURL(proj.demo_url || proj.desc)}> 
                                    {/* Using desc as url fallback if it's a link, or just alert */}
                                        <Image source={{uri: proj.image}} style={styles.projThumb} />
                                        <View style={styles.projInfo}>
                                            <Text style={styles.projTitle}>{proj.title}</Text>
                                            <Text style={styles.projDesc} numberOfLines={2}>{proj.desc}</Text>
                                            <View style={{flexDirection: 'row', marginTop: 8}}>
                                                <View style={styles.badge}><Text style={styles.badgeText}>Active</Text></View>
                                            </View>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                                    </TouchableOpacity>
                                ))}
                                {(!profile?.projects || profile.projects.length === 0) && (
                                    <View style={{padding: 20, alignItems: 'center', width: '100%'}}>
                                        <Text style={{textAlign: 'center', marginTop: 20, color: '#999', fontSize: 16}}>Let's showcase your first project.</Text>
                                    </View>
                                )}
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
                                 
                                 <Text style={styles.sectionTitleSmall}>Socials</Text>
                                 <View style={styles.socialRow}>
                                     {profile?.socials?.github && (
                                         <TouchableOpacity onPress={() => Linking.openURL(profile.socials.github)} style={styles.socialBtn}>
                                             <Ionicons name="logo-github" size={24} />
                                             <Text style={{marginLeft: 8}}>GitHub</Text>
                                         </TouchableOpacity>
                                     )}
                                     {profile?.socials?.linkedin && (
                                         <TouchableOpacity onPress={() => Linking.openURL(profile.socials.linkedin)} style={styles.socialBtn}>
                                             <Ionicons name="logo-linkedin" size={24} color="#0077b5" />
                                             <Text style={{marginLeft: 8}}>LinkedIn</Text>
                                         </TouchableOpacity>
                                     )}
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
                            {profile?.uid ? (
                                <QRCode
                                    value={`campushub://profile/${profile.uid}`}
                                    size={200}
                                    color="black"
                                    backgroundColor="white"
                                />
                            ) : (
                                <Ionicons name="qr-code" size={150} color="#000" />
                            )}
                        </View>
                        <Text style={styles.qrName}>@{profile?.username || 'user'}</Text>
                        <View style={{flexDirection: 'row', gap: 10}}>
                             <TouchableOpacity style={styles.closeQrBtn} onPress={() => setShowQr(false)}>
                                 <Text style={styles.closeQrText}>Close</Text>
                             </TouchableOpacity>
                             <TouchableOpacity style={[styles.closeQrBtn, {backgroundColor: COLORS.primary}]} onPress={handleShare}>
                                 <Text style={[styles.closeQrText, {color: '#fff'}]}>Share</Text>
                             </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Post Detail Modal */}
            <Modal visible={!!selectedPost} transparent animationType="fade" onRequestClose={() => setSelectedPost(null)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedPost(null)} />
                    <View style={styles.postModalContent}>
                         <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedPost(null)}>
                             <Ionicons name="close" size={24} color="#fff" />
                         </TouchableOpacity>
                         <ScrollView>
                             <Image source={{uri: selectedPost?.media_urls?.[0] || 'https://picsum.photos/400/400'}} style={styles.postModalImg} />
                             <View style={styles.postModalBody}>
                                 <View style={{flexDirection:'row', alignItems:'center', marginBottom:10}}>
                                     <Image source={{uri: profile?.avatar_url}} style={{width:30, height:30, borderRadius:15, marginRight:10}} />
                                     <Text style={{fontWeight:'bold'}}>{profile?.name}</Text>
                                 </View>
                                 <Text style={styles.postModalTitle}>{selectedPost?.title || "Post Title"}</Text>
                                 <Text style={styles.postModalText}>{selectedPost?.content_body || "No caption provided."}</Text>
                                 
                                 <View style={{flexDirection:'row', marginTop: 20, gap: 20, borderTopWidth:1, borderColor:'#eee', paddingTop:15}}>
                                     <View style={{flexDirection:'row', alignItems:'center'}}><Ionicons name="heart-outline" size={20} /><Text style={{marginLeft:5}}>{selectedPost?.likes_count || 0}</Text></View>
                                     <View style={{flexDirection:'row', alignItems:'center'}}><Ionicons name="chatbubble-outline" size={20} /><Text style={{marginLeft:5}}>{selectedPost?.comments_count || 0}</Text></View>
                                     <View style={{flexDirection:'row', alignItems:'center'}}><Ionicons name="eye-outline" size={20} /><Text style={{marginLeft:5}}>{selectedPost?.views_count || 0}</Text></View>
                                 </View>
                             </View>
                         </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Scanner Modal */}
            <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
                 <View style={{flex: 1, backgroundColor: 'black'}}>
                     <CameraView
                        style={{flex: 1}}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                     >
                         <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                             <View style={{width: 250, height: 250, borderWidth: 2, borderColor: 'white', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)'}} />
                             <Text style={{color: 'white', marginTop: 20, fontWeight: 'bold'}}>Scan User QR Code</Text>
                         </View>
                         <TouchableOpacity onPress={() => setShowScanner(false)} style={[styles.closeModalBtn, {position: 'absolute', top: 50, right: 30}]}>
                              <Ionicons name="close" size={30} color="white" />
                         </TouchableOpacity>
                     </CameraView>
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

    // New Styles
    projectCard: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f9f9f9', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
    projThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
    projInfo: { flex: 1, marginLeft: 12 },
    projTitle: { fontWeight: 'bold', fontSize: 14, color: '#333' },
    projDesc: { fontSize: 12, color: '#666', marginTop: 4 },
    badge: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
    badgeText: { color: '#0284c7', fontSize: 10, fontWeight: '700' },

    socialRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    socialBtn: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8 },
    
    // Post Modal
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    postModalContent: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', maxHeight: '80%' },
    postModalImg: { width: '100%', height: 300 },
    postModalBody: { padding: 20 },
    postModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    postModalText: { fontSize: 14, lineHeight: 20, color: '#333' },
    closeModalBtn: { position: 'absolute', top: 15, right: 15, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
});
