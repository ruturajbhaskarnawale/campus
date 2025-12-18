import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
  Animated,
  Linking,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SHADOWS, SPACING, RADIUS, FONTS } from '../../../core/design/Theme';

// Components
import ContributionGraph from '../components/ContributionGraph';
import SkillCard from '../components/SkillCard';
import BadgesList from '../components/BadgesList';
import ProfileStats from '../components/ProfileStats';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  
  // Data States
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [contributions, setContributions] = useState({});
  const [skills, setSkills] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    init();
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, [route?.params?.userId]);

  const [viewMode, setViewMode] = useState('public');
  const [themeColor, setThemeColor] = useState(COLORS.primary);
  const [completion, setCompletion] = useState(0);

  const init = async () => {
    try {
      setLoading(true);
      
      let targetId = route?.params?.userId;
      const currentUid = await getCurrentUserId();
      
      if (!targetId || targetId === currentUid) {
        targetId = currentUid;
        setIsOwnProfile(true);
      } else {
        setIsOwnProfile(false);
      }

      await Promise.all([
        fetchEnhancedProfile(targetId),
        fetchActivity(targetId),
        fetchContributions(targetId),
        fetchSkills(targetId)
      ]);
      
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ... (existing effects)

  const fetchEnhancedProfile = async (uid) => {
    try {
      const res = await client.get(`/profile/${uid}/enhanced`);
      setProfile(res.data);
      if (res.data.theme_color) setThemeColor(res.data.theme_color);
      if (res.data.completion_percent) setCompletion(res.data.completion_percent);
    } catch (e) {
      console.warn("Enhanced profile failed", e);
    }
  };

  const fetchActivity = async (uid) => {
    try {
      const res = await client.get(`/profile/${uid}/activity`);
      setActivity(res.data || []);
    } catch (e) { console.warn('Activity fetch failed', e); setActivity([]); }
  };

  const fetchContributions = async (uid) => {
    try {
       const res = await client.get(`/profile/${uid}/contributions`);
       setContributions(res.data || {});
    } catch (e) { console.warn('Contributions fetch failed', e); setContributions({}); }
  };

  const fetchSkills = async (uid) => {
    try {
      const res = await client.get(`/profile/${uid}/skills`);
      setSkills(res.data || []);
    } catch (e) { console.warn('Skills fetch failed', e); setSkills([]); }
  };

  const onRefresh = () => {
    setRefreshing(true);
    init();
  };

  const handleEndorse = async (skillName) => {
    if (isOwnProfile) return Alert.alert("Nice try!", "You can't endorse yourself.");
    try {
      Alert.alert("Endorsed!", `You endorsed ${skillName}`);
      // Call API
    } catch (e) {
      Alert.alert("Error");
    }
  };

  // Actions
  const showQRCode = () => {
      Alert.alert('Scan QR', 'Share this code to connect instantly.\n[ |||| || ||| ]');
  };

  // Renderers
  const renderSocials = () => {
    if (!profile?.socials) return null;
    const links = profile.socials;
    
    return (
      <View style={styles.socialRow}>
        {links.github && (
          <TouchableOpacity onPress={() => Linking.openURL(links.github)} style={styles.socialIcon}>
            <Ionicons name="logo-github" size={24} color="#333" />
          </TouchableOpacity>
        )}
        {links.linkedin && (
          <TouchableOpacity onPress={() => Linking.openURL(links.linkedin)} style={styles.socialIcon}>
            <Ionicons name="logo-linkedin" size={24} color="#0077b5" />
          </TouchableOpacity>
        )}
        {links.website && (
          <TouchableOpacity onPress={() => Linking.openURL(links.website)} style={styles.socialIcon}>
            <Ionicons name="globe-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )}
         <TouchableOpacity onPress={() => Alert.alert('Resume', 'Downloading PDF...')} style={styles.resumeBtn}>
            <Ionicons name="document-text-outline" size={16} color="#fff" />
            <Text style={styles.resumeText}>Resume</Text>
         </TouchableOpacity>
      </View>
    );
  };

  const renderActivity = () => (
    <View style={styles.tabContent}>
       {activity.length === 0 ? (
         <Text style={styles.emptyText}>No recent activity.</Text>
       ) : (
         activity.map((item, index) => (
           <View key={index} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons 
                  name={item.type === 'project' ? 'rocket' : item.type === 'comment' ? 'chatbubble' : 'star'} 
                  size={20} 
                  color={COLORS.primary} 
                />
              </View>
              <View style={styles.activityContent}>
                 <Text style={styles.activityText}>{item.text}</Text>
                 <Text style={styles.activityTime}>{item.time}</Text>
              </View>
           </View>
         ))
       )}
    </View>
  );
  const renderCompletionMeter = () => {
     if (!isOwnProfile || completion >= 100) return null;
     return (
         <View style={styles.completionContainer}>
             <View style={styles.completionHeader}>
                 <Text style={styles.completionTitle}>Profile Strength: {completion}%</Text>
                 <Text style={styles.completionSub}>Add a bio to reach 100%</Text>
             </View>
             <View style={styles.completionTrack}>
                 <View style={[styles.completionFill, { width: `${completion}%`, backgroundColor: themeColor }]} />
             </View>
         </View>
     );
  };

  const renderPortfolioGrid = () => {
      // Mock projects for masonry feeling
      const projects = [
          {id: 1, title: 'AI Chat', image: 'https://via.placeholder.com/300x400', height: 200},
          {id: 2, title: 'Crypto Tracker', image: 'https://via.placeholder.com/300x200', height: 150},
          {id: 3, title: 'Social Graph', image: 'https://via.placeholder.com/300x300', height: 180},
          {id: 4, title: 'Food Delivery', image: 'https://via.placeholder.com/300x250', height: 160},
      ];

      return (
          <View style={styles.portfolioGrid}>
              <View style={styles.portfolioColumn}>
                  {projects.filter((_, i) => i % 2 === 0).map(p => (
                      <TouchableOpacity key={p.id} style={[styles.portfolioItem, {height: p.height}]}>
                          <Image source={{uri: p.image}} style={styles.portfolioImage} />
                          <View style={styles.portfolioOverlay}>
                              <Text style={styles.portfolioTitle}>{p.title}</Text>
                          </View>
                      </TouchableOpacity>
                  ))}
              </View>
              <View style={styles.portfolioColumn}>
                   {projects.filter((_, i) => i % 2 !== 0).map(p => (
                      <TouchableOpacity key={p.id} style={[styles.portfolioItem, {height: p.height}]}>
                          <Image source={{uri: p.image}} style={styles.portfolioImage} />
                          <View style={styles.portfolioOverlay}>
                              <Text style={styles.portfolioTitle}>{p.title}</Text>
                          </View>
                      </TouchableOpacity>
                  ))}
              </View>
          </View>
      );
  };

  const renderAbout = () => (
      <View style={styles.tabContent}>
          <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.sectionBody}>
                  {profile?.bio || "No bio available."}
              </Text>
          </View>

          <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Education</Text>
              <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>University of Technology</Text>
                      <Text style={styles.timelineSubtitle}>B.S. Computer Science • 2022 - 2026</Text>
                  </View>
              </View>
          </View>

          <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Experience</Text>
              <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>Frontend Intern</Text>
                      <Text style={styles.timelineSubtitle}>TechCorp Inc. • Summer 2024</Text>
                      <Text style={styles.timelineBody}>Built responsive dashboards using React Native.</Text>
                  </View>
              </View>
          </View>
          
          <TouchableOpacity style={styles.recommendationBtn}>
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.recommendationText}>Write a Recommendation</Text>
          </TouchableOpacity>
      </View>
  );

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {renderCompletionMeter()}
      
      {!isOwnProfile && (
          <View style={styles.mutualContainer}>
              <View style={styles.stackedAvatars}>
                  <View style={[styles.miniAvatar, {backgroundColor: 'red'}]} />
                  <View style={[styles.miniAvatar, {backgroundColor: 'blue', marginLeft: -10}]} />
              </View>
              <Text style={styles.mutualText}>You and Alice both know Bob and 2 others.</Text>
          </View>
      )}

      <ProfileStats 
        stats={profile?.stats || {}} 
        level={profile?.level || 1}
        xp={profile?.current_xp || 0}
        nextXp={profile?.next_level_xp || 1000}
        color={themeColor}
      />
      
      <BadgesList badges={profile?.badges} />
      
      <ContributionGraph data={contributions} color={themeColor} />
      
      <SkillCard skills={skills} onEndorse={handleEndorse} color={themeColor} />
    </View>
  );

  // ... (keep renderActivity)

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor || COLORS.primary} />
      </View>
    );
  }


  // Parallax Config
  const HEADER_MAX_HEIGHT = 180;
  const HEADER_MIN_HEIGHT = 80; // Not fully collapsing for simplicity in this version, just visual parallax
  
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT],
    outputRange: [0, -HEADER_MAX_HEIGHT / 2],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.5, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Animated Banner Layer */}
      <Animated.View 
        style={[
          styles.bannerContainer, 
          { 
            height: HEADER_MAX_HEIGHT,
            transform: [{ translateY: headerTranslateY }, { scale: imageScale }] 
          }
        ]}
      >
        <ImageBackground
          source={{ uri: profile?.cover_photo || 'https://via.placeholder.com/800x200' }}
          style={styles.banner}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.bannerGradient}
          />
        </ImageBackground>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT - 60 }} // Overlap banner
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
           <View style={styles.avatarWrapper}>
              <Animated.View style={[styles.avatarPulse, { transform: [{ scale: pulseAnim }], borderColor: themeColor }]} />
              <Image 
                source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }}
                style={styles.avatar} 
              />
              <View style={[styles.onlineDot, { backgroundColor: '#4caf50' }]} />
           </View>
           
           <View style={styles.identity}>
              <Text style={styles.name}>{profile?.name || 'User Name'}</Text>
              <Text style={styles.role}>Full Stack Developer</Text>
              <Text style={styles.bio}>{profile?.bio || 'Passionate developer building amazing things.'}</Text>
              {renderSocials()}
              
              {!isOwnProfile && (
                <View style={{flexDirection: 'row', gap: 10}}>
                  <TouchableOpacity style={styles.followBtn}>
                    <Text style={styles.followText}>Follow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={showQRCode}>
                     <Ionicons name="qr-code-outline" size={20} color={COLORS.text.primary} />
                  </TouchableOpacity>
                </View>
              )}
               {isOwnProfile && (
                  <TouchableOpacity style={styles.qrBtn} onPress={showQRCode}>
                      <Ionicons name="qr-code" size={20} color={COLORS.primary} />
                      <Text style={styles.qrText}>Share Profile</Text>
                  </TouchableOpacity>
              )}
           </View>
        </View>

        <View style={styles.mainContent}>
          {/* Tabs */}
          <View style={styles.tabs}>
             {['Overview', 'Activity', 'Projects', 'About'].map(tab => (
               <TouchableOpacity 
                 key={tab} 
                 style={[styles.tab, activeTab === tab && styles.tabActive]}
                 onPress={() => setActiveTab(tab)}
               >
                 <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
               </TouchableOpacity>
             ))}
          </View>

          {/* Dynamic Content */}
          <View style={styles.contentContainer}>
             {activeTab === 'Overview' && renderOverview()}
             {activeTab === 'Activity' && renderActivity()}
             {activeTab === 'Projects' && renderPortfolioGrid()}
             {activeTab === 'About' && renderAbout()}
          </View>
        </View>
        
        <View style={{ height: 40 }} />
      </Animated.ScrollView>
      
      {/* Floating Edit Button */}
       {isOwnProfile && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => navigation.navigate('EditProfile', { profile })}
        >
          <Ionicons name="pencil" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: COLORS.background.primary, // Blend with bg
  },
  onlineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    bottom: 5,
    right: 5,
    borderWidth: 3,
    borderColor: COLORS.background.primary,
  },
  identity: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  socialIcon: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    elevation: 2,
  },
  resumeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  followBtn: {
    backgroundColor: COLORS.text.primary,
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  followText: {
    color: '#fff',
    fontWeight: '700',
  },
  
  // Main Content
  mainContent: {
    backgroundColor: COLORS.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 10,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    justifyContent: 'space-between', // Spread tabs
  },
  tab: {
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  
  // Content
  contentContainer: {
    padding: 20,
  },
  tabContent: {
    gap: 16,
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  
  // Completion Meter
  completionContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 0, ...SHADOWS.small },
  completionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  completionTitle: { fontWeight: '700', fontSize: 14 },
  completionSub: { fontSize: 12, color: COLORS.text.secondary },
  completionTrack: { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  completionFill: { height: '100%', borderRadius: 4 },

  // Portfolio Grid
  portfolioGrid: { flexDirection: 'row', gap: 10 },
  portfolioColumn: { flex: 1, gap: 10 },
  portfolioItem: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#eee', marginBottom: 0 },
  portfolioImage: { width: '100%', height: '100%' },
  portfolioOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, backgroundColor: 'rgba(0,0,0,0.6)' },
  portfolioTitle: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  // Mutual
  mutualContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f8ff', padding: 12, borderRadius: 12 },
  stackedAvatars: { flexDirection: 'row', marginRight: 12 },
  miniAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'white' },
  mutualText: { flex: 1, fontSize: 12, color: COLORS.text.secondary },

  // New Buttons
  iconBtn: { padding: 10, backgroundColor: COLORS.background.secondary, borderRadius: 20 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 8, backgroundColor: COLORS.background.secondary, borderRadius: 20 },
  qrText: { color: COLORS.primary, fontWeight: '600', fontSize: 12 },

  // Activity
  activityItem: {
    flexDirection: 'row',
    backgroundColor: '#fff', 
    padding: 12,
    borderRadius: 12, 
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: COLORS.text.primary,
     fontWeight: '500',
    marginBottom: 4,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  // About Section Styles
  sectionCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, ...SHADOWS.small },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: COLORS.text.primary },
  sectionBody: { fontSize: 14, color: COLORS.text.secondary, lineHeight: 22 },
  
  timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginTop: 6 },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
  timelineSubtitle: { fontSize: 12, color: COLORS.text.tertiary, marginBottom: 4 },
  timelineBody: { fontSize: 13, color: COLORS.text.secondary },

  recommendationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, marginTop: 8 },
  recommendationText: { color: COLORS.primary, fontWeight: '600' },
  
  avatarPulse: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 100, borderWidth: 2, opacity: 0.5 }
});
