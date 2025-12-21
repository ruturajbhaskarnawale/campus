import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, SafeAreaView, RefreshControl, StatusBar, TextInput, TouchableOpacity, Animated, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProjectCard from '../../../core/widgets/ProjectCard';
import client from '../../../core/api/client';
import { FeedSkeleton } from '../../../core/widgets/SkeletonLoader';
import { SPACING, FONTS, RADIUS, SHADOWS } from '../../../core/design/Theme';
import { useTheme } from '../../../core/contexts/ThemeContext';
import PeopleYouMayKnow from '../components/PeopleYouMayKnow';
import { useNavigationContext } from '../../../context/NavigationContext';
import { useToast } from '../../../core/providers/ToastProvider';

const CATEGORIES = ["All", "AI/ML", "Web Dev", "Mobile", "Blockchain", "Design", "Data"];

export default function FeedScreen({ navigation }) {
    const { colors, isDark } = useTheme(); // Theme Hook
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
    const isDesktop = width >= 768;

    // Config Hide on Scroll
    const { setTabBarVisible, isTabBarVisible } = useNavigationContext();
    const lastOffsetY = useRef(0);
    const lastScrollTime = useRef(0);
    const scrollJsValue = useRef(0);
    
    // Optimized Scroll Handler: Throttled to prevent blocking JS thread
    const handleScroll = (event) => {
        const now = Date.now();
        if (now - lastScrollTime.current < 100) return; // Throttle to 100ms
        lastScrollTime.current = now;

        const currentOffset = event.nativeEvent.contentOffset.y;
        const diff = currentOffset - lastOffsetY.current;

        // Only toggle if significant scroll and valid range
        if (Math.abs(diff) > 20 && currentOffset > 0) {
            if (diff > 0 && currentOffset > 100) {
                 // Scrolling Down -> Hide
                 if (isTabBarVisible) setTabBarVisible(false);
            } else {
                 // Scrolling Up or Top -> Show
                 if (!isTabBarVisible) setTabBarVisible(true);
            }
        }
        lastOffsetY.current = currentOffset;
    };

    const fetchPosts = useCallback(async (pageNum = 1, shouldRefresh = false) => {
        try {
            if (pageNum === 1 && !shouldRefresh) setLoading(true);
            
            // Query Params
            let url = `/feed?page=${pageNum}&limit=10`;
            if (selectedCategory !== "All") url += `&skill=${selectedCategory}`;
            if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
            
            const response = await client.get(url);
            let data = response.data.data || [];
            if (response.data && Array.isArray(response.data)) data = response.data;
            
            if (shouldRefresh || pageNum === 1) {
                // Determine if there are more
                setHasMore(data.length >= 10);
                // Client side search filtering (limited to fetched batch - trade off)
                // Server-side search filtering enabled
                setPosts(data);
            } else {
                if (data.length < 10) setHasMore(false);
                setPosts(prev => [...prev, ...data]);
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
        const timer = setTimeout(() => setShowNewPosts(true), 30000); // 30s for demo
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
        // Interpolate background opacity/blur
        const headerOpacity = scrollY.interpolate({
            inputRange: [0, 50],
            outputRange: [0, 1],
            extrapolate: 'clamp'
        });

        return (
            <Animated.View style={[
                styles.headerContainer, 
                { 
                    backgroundColor: colors.background.secondary, // Dynamic Color
                    shadowOpacity: headerOpacity,
                    elevation: headerOpacity.interpolate({ inputRange:[0, 1], outputRange:[0, 4] }),
                    top: isDesktop ? 64 : 0, // Push below Navbar on Desktop
                }
            ]}>
                <View style={[styles.searchBar, { backgroundColor: colors.background.tertiary }, isDesktop && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
                    <Ionicons name="search-outline" size={20} color={colors.text.tertiary} />
                    <TextInput 
                        style={[styles.input, { color: colors.text.primary }]} 
                        placeholder="Search projects..." 
                        placeholderTextColor={colors.text.tertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        // Web outline fix
                        {...((Platform.OS === 'web') ? { style: [styles.input, { outlineStyle: 'none', color: colors.text.primary }] } : {})}
                    />
                </View>
                <FlatList 
                    horizontal 
                    data={CATEGORIES}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.categoriesList, 
                        isDesktop && { justifyContent: 'center', width: '100%', maxWidth: 700, alignSelf: 'center' }
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
        if (!loadingMore) return <View style={{height: 100}} />; // buffer
        return (
            <View style={{ padding: 20, alignItems: 'center', marginBottom: 50 }}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    const renderItem = ({ item, index }) => (
        <View>
            <ProjectCard project={item} navigation={navigation} onJoin={() => navigation.navigate('PostDetail', { postId: item.id })} />
            {/* Inject PeopleYouMayKnow after 3rd post */}
            {index === 2 && <PeopleYouMayKnow />}
        </View>
    );

    if (loading && !refreshing && posts.length === 0) return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
            {renderHeader()}
            <FeedSkeleton />
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background.primary} />
            
            {renderHeader()}

            <Animated.FlatList
                ref={flatListRef}
                data={posts}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={[
                    styles.list, 
                    isDesktop && { paddingTop: 130 + 64, // Adjust for Navbar + Header
                                   maxWidth: 800, alignSelf: 'center', width: '100%' } 
                ]} 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} progressViewOffset={isDesktop ? 120 : 60} />}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Ionicons name="folder-open-outline" size={64} color={colors.text.tertiary} />
                        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No projects found. Try different keywords!</Text>
                    </View>
                }
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true, listener: handleScroll } 
                )}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
            />

            {showNewPosts && (
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
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 10, 
        paddingBottom: SPACING.s,
        paddingTop: Platform.OS === 'android' ? 40 : 0 
    },
    searchBar: { flexDirection: 'row', alignItems: 'center', margin: SPACING.m, paddingHorizontal: SPACING.m, borderRadius: RADIUS.m, height: 44 },
    input: { flex: 1, marginLeft: SPACING.s, fontSize: 16, height: '100%' }, 
    categoriesList: { paddingHorizontal: SPACING.m },
    categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.round, marginRight: SPACING.s, borderWidth: 1, borderColor: 'transparent' },
    categoryText: { fontWeight: '500' },
    list: { padding: SPACING.m, paddingTop: 130 }, // Push list down below absolute header
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.m, marginTop: 100 },
    emptyText: { ...FONTS.body, textAlign: 'center', marginTop: SPACING.m },
    newPostsBtn: { position: 'absolute', top: 130, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.round, flexDirection: 'row', alignItems: 'center', ...SHADOWS.medium, zIndex: 100 },
    newPostsText: { color: 'white', fontWeight: 'bold', marginRight: 6, fontSize: 12 },
});
