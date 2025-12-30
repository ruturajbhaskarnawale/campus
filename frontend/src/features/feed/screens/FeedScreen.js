import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, SafeAreaView, RefreshControl, StatusBar, TextInput, TouchableOpacity, Animated, Platform, ActivityIndicator, useWindowDimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProjectCard from '../../../core/widgets/ProjectCard';
import client from '../../../core/api/client';
import { FeedSkeleton } from '../../../core/widgets/SkeletonLoader';
import { SPACING, FONTS, RADIUS, SHADOWS } from '../../../core/design/Theme';
import { useTheme } from '../../../core/contexts/ThemeContext';
import PeopleYouMayKnow from '../components/PeopleYouMayKnow';
import ProfileSummary from '../components/ProfileSummary';
import RightSidebar from '../components/RightSidebar';
import { useNavigationContext } from '../../../context/NavigationContext';
import { useToast } from '../../../core/providers/ToastProvider';

const CATEGORIES = ["All", "AI/ML", "Web Dev", "Mobile", "Blockchain", "Design", "Data"];

export default function FeedScreen({ navigation }) {
    const { colors, isDark, toggleTheme } = useTheme(); 
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [showNewPosts, setShowNewPosts] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const { showToast } = useToast();
    
    const flatListRef = useRef(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    
    // Responsive Logic
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024; // 3-column breakpoint
    const isTablet = width >= 768 && width < 1024; // Tablet (maybe 2 col?)

    // Config Hide on Scroll (Mobile Only)
    const { setTabBarVisible, isTabBarVisible } = useNavigationContext();
    const lastOffsetY = useRef(0);
    const lastScrollTime = useRef(0);
    
    const handleScroll = (event) => {
        if (isDesktop) return; // Disable hide logic on desktop

        const now = Date.now();
        if (now - lastScrollTime.current < 100) return; 
        lastScrollTime.current = now;

        const currentOffset = event.nativeEvent.contentOffset.y;
        const diff = currentOffset - lastOffsetY.current;

        if (Math.abs(diff) > 20 && currentOffset > 0) {
            if (diff > 0 && currentOffset > 100) {
                 if (isTabBarVisible) setTabBarVisible(false);
            } else {
                 if (!isTabBarVisible) setTabBarVisible(true);
            }
        }
        lastOffsetY.current = currentOffset;
    };

    const fetchPosts = useCallback(async (pageNum = 1, shouldRefresh = false) => {
        try {
            if (pageNum === 1 && !shouldRefresh) setLoading(true);
            
            let url = `/feed?page=${pageNum}&limit=10`;
            if (selectedCategory !== "All") url += `&skill=${selectedCategory}`;
            if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
            
            const response = await client.get(url);
            let data = response.data.data || [];
            if (response.data && Array.isArray(response.data)) data = response.data;
            
            if (shouldRefresh || pageNum === 1) {
                setHasMore(data.length >= 10);
                setPosts(data);
            } else {
                if (data.length < 10) setHasMore(false);
                setPosts(prev => {
                    // Filter duplicates
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPosts = data.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newPosts];
                });
            }

        } catch (error) {
            console.error("Failed to fetch posts:", error);
            showToast("Failed to load feed. Network error or session expired.", "error");
            if (pageNum === 1) setPosts([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [searchQuery, selectedCategory]);

    useEffect(() => {
        setPage(1);
        fetchPosts(1, false);
    }, [selectedCategory]); 

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setPage(1);
            fetchPosts(1, false);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => setShowNewPosts(true), 30000); 
        return () => clearTimeout(timer);
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
        fetchPosts(1, true);
        setShowNewPosts(false);
    };

    const loadMore = () => {
        if (!loadingMore && !loading && hasMore) {
            setLoadingMore(true);
            const nextPage = page + 1;
            setPage(nextPage);
            fetchPosts(nextPage, false);
        }
    };

    const scrollToTop = () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        setShowNewPosts(false);
        onRefresh();
    };

    const renderHeader = () => {
        const headerOpacity = scrollY.interpolate({
            inputRange: [0, 50],
            outputRange: [0, 1],
            extrapolate: 'clamp'
        });

        // Desktop Layout for Header items (categories) should be integrated or separate?
        // On desktop, categories might sit on top of feed or sidebar?
        // Let's keep categories on top for now.

        return (
            <Animated.View style={[
                styles.headerContainer, 
                { 
                    backgroundColor: colors.background.secondary, 
                    shadowOpacity: headerOpacity,
                    elevation: headerOpacity.interpolate({ inputRange:[0, 1], outputRange:[0, 4] }),
                    // Desktop adjustments:
                    ...(isDesktop ? { 
                        position: 'relative', // Not fixed on desktop? Or kept fixed.
                        paddingTop: 20
                    } : {
                        top: 0
                    })
                }
            ]}>
                {/* Top Navigation Row */}
                <View style={[styles.topNav, isDesktop && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
                     <TouchableOpacity onPress={() => navigation.navigate('Create')}>
                         <Ionicons name="create-outline" size={26} color={colors.text.primary} />
                     </TouchableOpacity>

                     <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' }}>
                        <Text style={{ fontFamily: FONTS.header, fontSize: 20, color: colors.primary, fontWeight: 'bold' }}>Campus Hub</Text>
                     </View>
                     
                     <View style={{flexDirection: 'row'}}>
                         <TouchableOpacity onPress={toggleTheme} style={{marginRight: 16}}>
                             <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={26} color={colors.text.primary} />
                         </TouchableOpacity>
                         <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                             <Ionicons name="notifications-outline" size={26} color={colors.text.primary} />
                         </TouchableOpacity>
                     </View>
                </View>

                <View style={[styles.searchBar, { backgroundColor: colors.background.tertiary }, isDesktop && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
                    <Ionicons name="search-outline" size={20} color={colors.text.tertiary} />
                    <TextInput 
                        style={[styles.input, { color: colors.text.primary }]} 
                        placeholder="Search projects..." 
                        placeholderTextColor={colors.text.tertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        {...((Platform.OS === 'web') ? { style: [styles.input, { outlineStyle: 'none', color: colors.text.primary }] } : {})}
                    />
                </View>
                <FlatList 
                    horizontal 
                    data={CATEGORIES}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.categoriesList, 
                        isDesktop && { justifyContent: 'center', width: '100%' }
                    ]}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={[
                                styles.categoryChip, 
                                { backgroundColor: colors.background.tertiary },
                                selectedCategory === item && { backgroundColor: colors.primary + '15', borderColor: colors.primary }
                            ]}
                            onPress={() => setSelectedCategory(item)}
                        >
                            <Text style={[
                                styles.categoryText, 
                                { color: colors.text.secondary },
                                selectedCategory === item && { color: colors.primary, fontWeight: '700' }
                            ]}>{item}</Text>
                        </TouchableOpacity>
                    )}
                    keyExtractor={i => i}
                />
            </Animated.View>
        );
    };

    const renderFooter = () => {
        if (!loadingMore) return <View style={{height: 100}} />; 
        return (
            <View style={{ padding: 20, alignItems: 'center', marginBottom: 50 }}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    const renderItem = ({ item, index }) => (
        <View>
            <ProjectCard project={item} navigation={navigation} onJoin={() => navigation.navigate('PostDetail', { postId: item.id })} />
            {/* Inject PeopleYouMayKnow after 3rd post ONLY on Mobile */}
            {!isDesktop && index === 2 && <PeopleYouMayKnow />}
        </View>
    );

    const FeedList = () => (
        <Animated.FlatList
            ref={flatListRef}
            data={posts}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={[
                styles.list, 
                isDesktop && { paddingTop: SPACING.m } // No deep padding needed if header is relative
            ]} 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
            ListEmptyComponent={
                <View style={styles.center}>
                    <Ionicons name="folder-open-outline" size={64} color={colors.text.tertiary} />
                    <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No projects found.</Text>
                </View>
            }
            onScroll={isDesktop ? undefined : Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true, listener: handleScroll } 
            )}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            showsVerticalScrollIndicator={!isDesktop}
        />
    );

    if (loading && !refreshing && posts.length === 0) return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
             {/* Simple Skeleton for now */}
            <FeedSkeleton />
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background.primary} />
            
            {/* Header stays at top for both? On desktop maybe just categories */}
            {/* On desktop, let's put header in the middle column flow or above columns? Above is cleaner */}
            {renderHeader()}

            {isDesktop ? (
                <View style={styles.desktopContainer}>
                    {/* Left Column */}
                    <View style={styles.leftCol}>
                        <ScrollView showsVerticalScrollIndicator={false} style={{flex: 1}}>
                             <ProfileSummary />
                        </ScrollView>
                    </View>
                    
                    {/* Middle Column */}
                    <View style={styles.middleCol}>
                         <FeedList />
                    </View>
                    
                    {/* Right Column */}
                    <View style={styles.rightCol}>
                         <ScrollView showsVerticalScrollIndicator={false} style={{flex: 1}}>
                             <RightSidebar />
                         </ScrollView>
                    </View>
                </View>
            ) : (
                <FeedList />
            )}

            {showNewPosts && !isDesktop && (
                <TouchableOpacity style={[styles.newPostsBtn, { backgroundColor: colors.primary }]} onPress={scrollToTop}>
                    <Text style={styles.newPostsText}>New Posts</Text>
                    <Ionicons name="arrow-up" size={16} color="white" />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerContainer: { 
        zIndex: 10, 
        paddingBottom: SPACING.s,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
        // Default relative or absolute is handled in style prop based on desktop/mobile
    },
    // Mobile specific header style
    mobileHeaderFixed: {
        position: 'absolute',
        top: 0, left: 0, right: 0
    },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        paddingBottom: SPACING.s,
    },
    
    searchBar: { flexDirection: 'row', alignItems: 'center', margin: SPACING.m, paddingHorizontal: SPACING.m, borderRadius: RADIUS.m, height: 44 },
    input: { flex: 1, marginLeft: SPACING.s, fontSize: 16, height: '100%' }, 
    categoriesList: { paddingHorizontal: SPACING.m },
    categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.round, marginRight: SPACING.s, borderWidth: 1, borderColor: 'transparent' },
    categoryText: { fontWeight: '500' },
    
    list: { padding: SPACING.m, paddingTop: 130 }, // Mobile padding default
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.m, marginTop: 100 },
    emptyText: { ...FONTS.body, textAlign: 'center', marginTop: SPACING.m },
    newPostsBtn: { position: 'absolute', top: 130, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.round, flexDirection: 'row', alignItems: 'center', ...SHADOWS.medium, zIndex: 100 },
    newPostsText: { color: 'white', fontWeight: 'bold', marginRight: 6, fontSize: 12 },
    
    // Desktop 3-Column Grid
    desktopContainer: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
        paddingHorizontal: SPACING.m,
        flex: 1,
    },
    leftCol: {
        width: 280,
        marginRight: SPACING.l,
        maxHeight: '100%', 
    },
    middleCol: {
        flex: 1,
        maxWidth: 600,
        marginRight: SPACING.l,
    },
    rightCol: {
        width: 300,
        maxHeight: '100%',
    }
});
