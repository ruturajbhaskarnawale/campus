import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Text, SafeAreaView, RefreshControl, StatusBar, TextInput, TouchableOpacity, Animated, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProjectCard from '../../../core/widgets/ProjectCard';
import client from '../../../core/api/client';
import { FeedSkeleton } from '../../../core/widgets/SkeletonLoader';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../../../core/design/Theme';
import PeopleYouMayKnow from '../components/PeopleYouMayKnow';
import { useNavigationContext } from '../../../context/NavigationContext';
import { useToast } from '../../../core/providers/ToastProvider';

const CATEGORIES = ["All", "AI/ML", "Web Dev", "Mobile", "Blockchain", "Design", "Data"];

export default function FeedScreen({ navigation }) {
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
    const { setTabBarVisible } = useNavigationContext();
    const lastOffsetY = useRef(0);
    
    const handleScroll = (event) => {
        const currentOffset = event.nativeEvent.contentOffset.y;
        const diff = currentOffset - lastOffsetY.current;

        // Only toggle if significant scroll
        if (Math.abs(diff) > 20) {
            if (diff > 0 && currentOffset > 100) {
                 // Scrolling Down -> Hide
                 setTabBarVisible(false);
            } else {
                 // Scrolling Up or Top -> Show
                 setTabBarVisible(true);
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
            
            const response = await client.get(url);
            let data = response.data.data || [];
            if (response.data && Array.isArray(response.data)) data = response.data;
            
            if (shouldRefresh || pageNum === 1) {
                // Determine if there are more
                setHasMore(data.length >= 10);
                // Client side search filtering (limited to fetched batch - trade off)
                if (searchQuery) {
                     data = data.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()));
                }
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
        if (!loadingMore && !loading && hasMore && !searchQuery) { // Disable infinite scroll during search if client-side only
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
                    backgroundColor: COLORS.background.secondary,
                    shadowOpacity: headerOpacity,
                    elevation: headerOpacity.interpolate({ inputRange:[0, 1], outputRange:[0, 4] }),
                    top: isDesktop ? 64 : 0, // Push below Navbar on Desktop
                }
            ]}>
                <View style={[styles.searchBar, isDesktop && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
                    <Ionicons name="search-outline" size={20} color={COLORS.text.tertiary} />
                    <TextInput 
                        style={styles.input} 
                        placeholder="Search projects..." 
                        placeholderTextColor={COLORS.text.tertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        // Web outline fix
                        {...((Platform.OS === 'web') ? { style: [styles.input, { outlineStyle: 'none' }] } : {})}
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
                            style={[styles.categoryChip, selectedCategory === item && styles.categoryChipActive]}
                            onPress={() => setSelectedCategory(item)}
                        >
                            <Text style={[styles.categoryText, selectedCategory === item && styles.categoryTextActive]}>{item}</Text>
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
                <ActivityIndicator size="small" color={COLORS.primary} />
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
        <SafeAreaView style={styles.container}>
            {renderHeader()}
            <FeedSkeleton />
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.primary} />
            
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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} progressViewOffset={isDesktop ? 120 : 60} />}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Ionicons name="folder-open-outline" size={64} color={COLORS.text.tertiary} />
                        <Text style={styles.emptyText}>No projects found. Try different keywords!</Text>
                    </View>
                }
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false, listener: handleScroll } 
                )}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
            />

            {showNewPosts && (
                <TouchableOpacity style={styles.newPostsBtn} onPress={scrollToTop}>
                    <Text style={styles.newPostsText}>New Posts</Text>
                    <Ionicons name="arrow-up" size={16} color="white" />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background.primary },
    headerContainer: { 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 10, 
        paddingBottom: SPACING.s,
        paddingTop: Platform.OS === 'android' ? 40 : 0 
    },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background.tertiary, margin: SPACING.m, paddingHorizontal: SPACING.m, borderRadius: RADIUS.m, height: 44 },
    input: { flex: 1, marginLeft: SPACING.s, fontSize: 16, color: COLORS.text.primary, height: '100%' }, 
    categoriesList: { paddingHorizontal: SPACING.m },
    categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.round, backgroundColor: COLORS.background.tertiary, marginRight: SPACING.s, borderWidth: 1, borderColor: 'transparent' },
    categoryChipActive: { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary },
    categoryText: { color: COLORS.text.secondary, fontWeight: '500' },
    categoryTextActive: { color: COLORS.primary, fontWeight: '700' },
    list: { padding: SPACING.m, paddingTop: 130 }, // Push list down below absolute header
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.m, marginTop: 100 },
    emptyText: { ...FONTS.body, color: COLORS.text.secondary, textAlign: 'center', marginTop: SPACING.m },
    newPostsBtn: { position: 'absolute', top: 130, alignSelf: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.round, flexDirection: 'row', alignItems: 'center', ...SHADOWS.medium, zIndex: 100 },
    newPostsText: { color: 'white', fontWeight: 'bold', marginRight: 6, fontSize: 12 },
});
