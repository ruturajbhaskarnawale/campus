import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Pressable, ScrollView, Share, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { getCurrentUserId } from '../../core/auth';
import LikesListModal from '../../features/feed/components/LikesListModal';
import PollWidget from './PollWidget';
import ReactionPicker from './ReactionPicker';
import { COLORS, RADIUS, SHADOWS, SPACING, FONTS } from '../design/Theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function ProjectCard({ project, onJoin, navigation }) {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const [showLikesModal, setShowLikesModal] = useState(false);
  
  const [isLiked, setIsLiked] = useState(project.is_liked || false);
  const [likesCount, setLikesCount] = useState(project.likes || 0);
  const [isBookmarked, setIsBookmarked] = useState(project.is_saved || false);
  const [showReactions, setShowReactions] = useState(false);
  const [myReaction, setMyReaction] = useState(project.my_reaction || 'like'); // default to like if liked
  
  const [isAuthor, setIsAuthor] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [pollData, setPollData] = useState(project.poll_data);
  const [userVoted, setUserVoted] = useState(false); // ToDo: Check from backend if already voted

  // Double tap logic
  let lastTap = null;

  useEffect(() => {
    checkUser();
  }, [project]);
  
  // Sync if props update (e.g. from feed refresh)
  useEffect(() => {
       if (project.is_liked !== undefined) setIsLiked(project.is_liked);
       if (project.is_saved !== undefined) setIsBookmarked(project.is_saved);
       if (project.likes !== undefined) setLikesCount(project.likes);
  }, [project.is_liked, project.is_saved, project.likes]);

  const checkUser = async () => {
       const uid = await getCurrentUserId();
       if (uid === project.author_uid) setIsAuthor(true);
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
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch(e){}
  };

  const handleLike = async (reactionType = 'like') => {
      // Optimistic Update
      const previousLiked = isLiked;
      const previousCount = likesCount;
      const previousReaction = myReaction;
      
      const isRemoving = isLiked && myReaction === reactionType;
      const newVal = !isRemoving;
      
      setIsLiked(newVal);
      setMyReaction(newVal ? reactionType : null);
      
      if (newVal) {
          if (!previousLiked) setLikesCount(prev => prev + 1); // New like
          animateIcon(likeScale);
          triggerHaptic();
      } else {
          setLikesCount(prev => Math.max(0, prev - 1));
      }
      
      setShowReactions(false);
      
      try {
           await client.post(`/feed/${project.id}/like`, { reaction_type: reactionType });
      } catch (e) {
          console.error("Like Error", e);
          // Revert
          setIsLiked(previousLiked);
          setLikesCount(previousCount);
          setMyReaction(previousReaction);
      }
  };

  const handlePollVote = async (optionIndex) => {
      if (userVoted) return;
      try {
          const res = await client.post(`/feed/${project.id}/polls/vote`, { option_index: optionIndex });
          setPollData(res.data.poll_data);
          setUserVoted(true);
          triggerHaptic();
      } catch(e) {
          console.error(e);
          Alert.alert("Error voting");
      }
  };

  // Helper for reaction icon
  const getReactionIcon = () => {
      if (!isLiked) return "heart-outline";
      switch(myReaction) {
          case 'love': return "heart";
          case 'celebrate': return "ribbon"; // map correctly
          case 'insightful': return "bulb";
          case 'funny': return "happy";
          default: return "heart";
      }
  };
  
  const getReactionColor = () => {
      if (!isLiked) return COLORS.text.secondary;
      switch(myReaction) {
          case 'love': return '#e91e63';
          case 'celebrate': return '#ffca28';
          case 'insightful': return '#ffb74d';
          case 'funny': return '#ffc107';
          default: return COLORS.error;
      }
  };

  const handleDoubleTap = () => {
      const now = Date.now();
      const DOUBLE_PRESS_DELAY = 300;
      if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
          if (!isLiked) handleLike();
          triggerHaptic();
      } else {
          lastTap = now;
          if (navigation) navigation.navigate('PostDetail', { postId: project.id });
      }
  };

  const handleBookmark = async () => {
      const prev = isBookmarked;
      setIsBookmarked(!isBookmarked);
      animateIcon(bookmarkScale);
      triggerHaptic();
      try {
           await client.post(`/feed/${project.id}/save`);
      } catch(e) {
           console.error(e);
           setIsBookmarked(prev);
      }
  };

  const handleJoin = async () => {
       try {
           // 1. Get Conversation ID
           const res = await client.post('/messages/init', { 
               target_uids: [project.author_uid], 
               type: 'direct' 
           });
           const threadId = res.data.conversation_id;
           
           // 2. Navigate to Chat
           // Navigate to 'Messages' tab then 'Chat' screen
           // We use the root navigation if possible, or assume 'Messages' is a sibling in Tab
           // If we are in FeedStack, we need to go back to Tab -> Messages
            navigation.navigate('Messages', {
               screen: 'Chat',
               params: {
                   threadId,
                   name: project.author_name,
                   avatar: project.author_avatar,
                   otherUid: project.author_uid,
                   initialMessage: `Hi, I'm interested in joining your project: ${project.title}`
               }
           });

       } catch (e) {
           console.error(e);
           Alert.alert("Error", "Failed to start chat.");
       }
  };

  const handleShare = async () => {
      try {
          await Share.share({
              message: `Check out this project: ${project.title} on Campus Hub!`,
              url: `https://campushub.app/feed/${project.id}`, 
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
                    const index = Math.round(x / (width - SPACING.m * 4)); 
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
          <TouchableOpacity onPress={() => navigation && navigation.navigate('Profile', { screen: 'ProfileDetail', params: { userId: project.author_uid }})}>
            <View style={styles.avatarPlaceholder}>
                {project.author_avatar ? (
                     <Animated.Image source={{uri: project.author_avatar}} style={{width:40,height:40,borderRadius:20}} />
                ) : (
                   <Text style={styles.avatarText}>{project.author_name ? project.author_name[0].toUpperCase() : 'A'}</Text>
                )}
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: project.author_avatar ? 0 : 0 }}>
            <TouchableOpacity onPress={() => navigation && navigation.navigate('Profile', { screen: 'ProfileDetail', params: { userId: project.author_uid }})}>
                <Text style={styles.author}>{project.author_name || 'Anonymous'}</Text>
            </TouchableOpacity>
            <Text style={styles.timestamp}>{timeAgo(project.timestamp)}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation && navigation.navigate('Profile', { screen: 'ProfileDetail', params: { userId: project.author_uid }})}>
             <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.description} numberOfLines={3}>{project.description}</Text>

        {/* Rich Media */}
        {renderMedia()}
        
        {/* Polls */}
        {pollData && (
            <PollWidget 
                pollData={pollData} 
                onVote={handlePollVote} 
                userVoted={userVoted}
            />
        )}

        {/* Tags */}
        <View style={styles.skillsContainer}>
          {project.skills_needed && project.skills_needed.map((skill, index) => (
            <View key={index} style={styles.chip}>
              <Text style={styles.chipText}>{skill}</Text>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
            {likesCount > 0 && (
             <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center'}} onPress={() => setShowLikesModal(true)}>
                 <Text style={styles.likedByText}>{likesCount} Likes</Text>
             </TouchableOpacity>
            )}
        </View>

        {/* Actions */}
        <View style={styles.footer}>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleLike('like')} 
            onLongPress={() => setShowReactions(true)}
            delayLongPress={300}
          >
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Ionicons name={getReactionIcon()} size={24} color={getReactionColor()} />
            </Animated.View>
            <Text style={[styles.actionText, isLiked && { color: getReactionColor() }]}>
                {isLiked && myReaction !== 'like' ? myReaction.charAt(0).toUpperCase() + myReaction.slice(1) : 'Like'}
            </Text>
          </TouchableOpacity>

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
              <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={handleJoin}>
                <View style={styles.joinButton}>
                   <Text style={styles.joinText}>Join Project</Text>
                </View>
              </TouchableOpacity>
          )}
        </View>

        <LikesListModal 
            visible={showLikesModal} 
            onClose={() => setShowLikesModal(false)}
            postId={project.id}
            navigation={navigation}
        />
        
        <ReactionPicker 
            visible={showReactions}
            onClose={() => setShowReactions(false)}
            onSelect={handleLike}
        />

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
      fontSize: 12, color: COLORS.text.tertiary
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: SPACING.s,
    position: 'relative', 
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
