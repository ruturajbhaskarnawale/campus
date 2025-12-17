import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Pressable, ScrollView, Share, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { getCurrentUserId } from '../../core/auth';
import { COLORS, RADIUS, SHADOWS, SPACING, FONTS } from '../design/Theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function ProjectCard({ project, onJoin, navigation }) {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(project.likes || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Double tap logic
  let lastTap = null;

  useEffect(() => {
    checkUser();
  }, [project]);

  const checkUser = async () => {
       const uid = await getCurrentUserId();
       if (uid === project.author_uid) setIsAuthor(true);
       // Check if liked previously (mock or api)
  };

  const handlePressIn = () => {
    Animated.spring(scaleValue, { toValue: 0.98, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, { toValue: 1, useNativeDriver: true }).start();
  };

  const animateIcon = (scaleAnim) => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const triggerHaptic = () => {
      // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
      // Commented out to prevent web errors if package issue, but normally safe in Expo
      // Safe guard:
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch(e){}
  };

  const handleLike = async (reactionType = 'like') => {
      const newVal = !isLiked;
      setIsLiked(newVal);
      setLikesCount(prev => newVal ? prev + 1 : prev - 1);
      animateIcon(likeScale);
      triggerHaptic();
      
      try {
           await client.post(`/feed/${project.id}/react`, { reaction: reactionType, uid: await getCurrentUserId() });
      } catch (e) {
          console.error(e);
      }
      setShowReactions(false);
  };

  const handleDoubleTap = () => {
      const now = Date.now();
      const DOUBLE_PRESS_DELAY = 300;
      if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
          if (!isLiked) handleLike();
          triggerHaptic();
      } else {
          lastTap = now;
          // Single tap logic if needed (e.g. open image), for now do nothing or navigate
          if (navigation) navigation.navigate('PostDetail', { postId: project.id });
      }
  };

  const handleBookmark = () => {
      setIsBookmarked(!isBookmarked);
      animateIcon(bookmarkScale);
      triggerHaptic();
  };

  const handleShare = async () => {
      try {
          await Share.share({
              message: `Check out this project: ${project.title} on Campus Hub!`,
              url: `https://campushub.app/feed/${project.id}`, // Deep link
          });
      } catch (error) {
          Alert.alert(error.message);
      }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const renderMedia = () => {
      if (!project.media_urls || project.media_urls.length === 0) return null;

      return (
          <View>
              <ScrollView 
                horizontal 
                pagingEnabled 
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                    const x = e.nativeEvent.contentOffset.x;
                    const index = Math.round(x / (width - SPACING.m * 4)); // approx width adjustment
                    setCurrentMediaIndex(index);
                }}
                scrollEventThrottle={16}
                style={styles.mediaScroll}
              >
                  {project.media_urls.map((url, i) => (
                      <Pressable key={i} onPress={handleDoubleTap}>
                          <Animated.Image 
                            source={{ uri: url }} 
                            style={styles.mediaImage} 
                            resizeMode="cover"
                          />
                      </Pressable>
                  ))}
              </ScrollView>
              {project.media_urls.length > 1 && (
                  <View style={styles.pagination}>
                      {project.media_urls.map((_, i) => (
                          <View key={i} style={[styles.dot, i === currentMediaIndex && styles.activeDot]} />
                      ))}
                  </View>
              )}
          </View>
      );
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleValue }] }]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={() => navigation && navigation.navigate('PostDetail', { postId: project.id })}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder}>
             <Text style={styles.avatarText}>{project.author_name ? project.author_name[0].toUpperCase() : 'A'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.author}>{project.author_name || 'Anonymous'}</Text>
            <Text style={styles.timestamp}>{timeAgo(project.timestamp)}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation && navigation.navigate('Profile', { userId: project.author_uid })}>
             <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.description} numberOfLines={3}>{project.description}</Text>

        {/* Rich Media */}
        {renderMedia()}

        {/* Tags */}
        <View style={styles.skillsContainer}>
          {project.skills_needed && project.skills_needed.map((skill, index) => (
            <View key={index} style={styles.chip}>
              <Text style={styles.chipText}>{skill}</Text>
            </View>
          ))}
        </View>

        {/* Stats / Liked By Pile */}
        <View style={styles.statsRow}>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 {[1,2,3].map((_,i) => (
                     <View key={i} style={[styles.miniAvatar, { marginLeft: i > 0 ? -10 : 0, zIndex: 10-i, backgroundColor: COLORS.primaryGradient[i%2] }]}>
                          <Text style={{fontSize:8, color:'white'}}>{String.fromCharCode(65+i)}</Text>
                     </View>
                 ))}
                 <Text style={styles.likedByText}>Liked by Alice and {likesCount} others</Text>
             </View>
        </View>

        {/* Actions */}
        <View style={styles.footer}>
          
          {/* Like / Reactions */}
          <View>
              {showReactions && (
                  <View style={styles.reactionTray}>
                      {['🔥','👏','❤️','💡'].map(emoji => (
                          <TouchableOpacity key={emoji} onPress={() => handleLike(emoji)} style={{padding: 4}}>
                              <Text style={{fontSize: 20}}>{emoji}</Text>
                          </TouchableOpacity>
                      ))}
                  </View>
              )}
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleLike('like')} 
                onLongPress={() => {
                    setShowReactions(true);
                    triggerHaptic();
                }}
              >
                <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                    <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? COLORS.error : COLORS.text.secondary} />
                </Animated.View>
                <Text style={[styles.actionText, isLiked && { color: COLORS.error }]}>{likesCount}</Text>
              </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.actionButton} onPress={() => navigation && navigation.navigate('Comments', { postId: project.id })}>
            <Ionicons name="chatbubble-outline" size={22} color={COLORS.text.secondary} />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={22} color={COLORS.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleBookmark}>
             <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
                <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={22} color={isBookmarked ? COLORS.primary : COLORS.text.secondary} />
             </Animated.View>
          </TouchableOpacity>
          
          {isAuthor ? (
              <TouchableOpacity style={styles.analyticsBtn}>
                   <Ionicons name="stats-chart" size={16} color={COLORS.primary} />
                   <Text style={{fontSize: 12, color: COLORS.primary, fontWeight: 'bold', marginLeft: 4}}>View Stats</Text>
              </TouchableOpacity>
          ) : (
              <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={onJoin}>
                <View style={styles.joinButton}>
                   <Text style={styles.joinText}>Join</Text>
                </View>
              </TouchableOpacity>
          )}
        </View>

      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.card,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.light,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.s,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  author: {
    ...FONTS.h3,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  timestamp: {
    ...FONTS.caption,
  },
  title: {
    ...FONTS.h2,
    fontSize: 18,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  description: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: SPACING.m,
  },
  mediaScroll: {
      width: '100%',
      height: 200,
      marginBottom: SPACING.m,
      borderRadius: RADIUS.m,
  },
  mediaImage: {
      width: width - (SPACING.m * 4) - 2, // Accounting for padding
      height: 200,
      borderRadius: RADIUS.m,
      marginRight: SPACING.s,
      backgroundColor: '#f0f0f0'
  },
  pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: -20,
      marginBottom: 10,
  },
  dot: {
      width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 3
  },
  activeDot: { backgroundColor: 'white', width: 8, height: 8, borderRadius: 4, marginTop: -1 },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.m,
  },
  chip: {
    backgroundColor: '#f3e5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.s,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.s,
      paddingHorizontal: 4,
  },
  miniAvatar: {
      width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'white', justifyContent: 'center', alignItems: 'center'
  },
  likedByText: {
      fontSize: 12, color: COLORS.text.tertiary, marginLeft: 8
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: SPACING.s,
    position: 'relative', // for reactions
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.l,
    padding: 4,
  },
  actionText: {
    marginLeft: 4,
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  reactionTray: {
      position: 'absolute',
      bottom: 40,
      left: 0,
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 8,
      flexDirection: 'row',
      gap: 8,
      ...SHADOWS.medium,
      zIndex: 100,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
  },
  joinText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  analyticsBtn: {
      marginLeft: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.background.tertiary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: RADIUS.s,
  }
});
