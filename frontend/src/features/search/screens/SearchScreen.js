import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  FlatList,
  Alert,
  useWindowDimensions,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../../../core/design/Theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SearchScreen({ navigation }) {
  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [results, setResults] = useState({ users: [], projects: [], posts: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trending, setTrending] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    skills: [],
    sortBy: 'relevance'
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTime, setSearchTime] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const searchTimeout = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Initialize
  useEffect(() => {
    init();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  const init = async () => {
    try {
      const uid = await getCurrentUserId();
      setCurrentUserId(uid);
      loadRecentSearches();
      loadTrendingSearches();
    } catch (error) {
      console.error('Init error:', error);
    }
  };

  // Real-time Search with Debouncing
  const handleSearchInput = (text) => {
    setSearchQuery(text);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (text.length >= 2) {
      fetchSuggestions(text);
    } else {
      setSuggestions([]);
    }
    
    searchTimeout.current = setTimeout(() => {
      if (text.length >= 2) {
        performSearch(text);
      } else {
        setResults({ users: [], projects: [], posts: [], total: 0 });
      }
    }, 300);
  };

  // Perform Search
  const performSearch = async (query) => {
    try {
      setLoading(true);
      const startTime = Date.now();
      
      const params = {
        q: query,
        type: activeTab,
        skills: filters.skills.join(','),
        sort: filters.sortBy
      };
      
      const response = await client.get('/search/unified', { params });
      const data = response.data;
      
      setResults(data);
      setSearchTime(data.searchTime || Date.now() - startTime);
      saveToRecentSearches(query);
      
    } catch (error) {
      console.error('Search error:', error);
      setResults({ users: [], projects: [], posts: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Suggestions
  const fetchSuggestions = async (partial) => {
    try {
      const response = await client.get('/search/suggestions', {
        params: { q: partial }
      });
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Suggestions error:', error);
      setSuggestions([]);
    }
  };

  // Recent Searches
  const loadRecentSearches = () => {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Load recent searches error:', error);
    }
  };

  const saveToRecentSearches = (query) => {
    try {
      let recent = [...recentSearches];
      recent = recent.filter(q => q !== query);
      recent.unshift(query);
      recent = recent.slice(0, 10);
      setRecentSearches(recent);
      localStorage.setItem('recentSearches', JSON.stringify(recent));
    } catch (error) {
      console.error('Save recent search error:', error);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Trending Searches
  const loadTrendingSearches = async () => {
    try {
      const response = await client.get('/search/trending');
      setTrending(response.data.trending || []);
    } catch (error) {
      console.error('Trending error:', error);
      setTrending([]);
    }
  };

  // Actions
  const handleFollow = async (userId) => {
    try {
      await client.post('/social/follow', {
        follower: currentUserId,
        followee: userId
      });
      Alert.alert('Success', 'Now following user');
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  const handleMessage = (userId, userName) => {
    navigation.navigate('Messages', {
      screen: 'Chat',
      params: { userId, userName }
    });
  };

  // Render Match Score
  const renderMatchScore = (score) => {
    if (!score) return null;
    
    const color = score >= 70 ? COLORS.success : score >= 40 ? COLORS.warning : COLORS.error;
    
    return (
      <View style={[styles.matchBadge, { backgroundColor: color + '20', borderColor: color }]}>
        <Ionicons name="star" size={12} color={color} />
        <Text style={[styles.matchScore, { color }]}>{score}% Match</Text>
      </View>
    );
  };

  // Render Search Bar
  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.searchGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={22} color={COLORS.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users, projects, or posts..."
            value={searchQuery}
            onChangeText={handleSearchInput}
            placeholderTextColor={COLORS.text.tertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={22} color={COLORS.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.filterButtonGradient}
          >
            <Ionicons name="options" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  // Render Suggestions
  const renderSuggestions = () => {
    if (suggestions.length === 0 || !searchQuery) return null;
    
    return (
      <Animated.View style={[styles.suggestionsContainer, { opacity: fadeAnim }]}>
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionItem}
            onPress={() => {
              setSearchQuery(suggestion);
              performSearch(suggestion);
              setSuggestions([]);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={16} color={COLORS.primary} />
            <Text style={styles.suggestionText}>{suggestion}</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.text.tertiary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </Animated.View>
    );
  };

  // Render Tabs
  // Render Tabs (Pills)
  const renderTabs = () => {
    const tabs = [
      { id: 'all', label: 'All' },
      { id: 'users', label: 'People' },
      { id: 'projects', label: 'Projects' },
      { id: 'posts', label: 'Posts' }
    ];

    return (
      <View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.tab, activeTab === item.id && styles.activeTab]}
              onPress={() => {
                setActiveTab(item.id);
                if (searchQuery) performSearch(searchQuery);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === item.id && styles.activeTabText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render Filters
  const renderFilters = () => {
    if (!showFilters) return null;
    
    return (
      <Animated.View style={[styles.filtersPanel, { opacity: fadeAnim }]}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filters</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Skills Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Skills</Text>
          <View style={styles.skillsInput}>
            <TextInput
              style={styles.filterInput}
              placeholder="Add skill and press enter..."
              placeholderTextColor={COLORS.text.tertiary}
              onSubmitEditing={(e) => {
                const skill = e.nativeEvent.text.trim();
                if (skill && !filters.skills.includes(skill)) {
                  setFilters({ ...filters, skills: [...filters.skills, skill] });
                  e.target.clear();
                }
              }}
            />
          </View>
          {filters.skills.length > 0 && (
            <View style={styles.skillTags}>
              {filters.skills.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <LinearGradient
                    colors={[COLORS.primary + '30', COLORS.secondary + '30']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                  <Text style={styles.skillTagText}>{skill}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setFilters({
                        ...filters,
                        skills: filters.skills.filter(s => s !== skill)
                      });
                    }}
                  >
                    <Ionicons name="close" size={14} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
        
        {/* Sort Options */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Sort By</Text>
          <View style={styles.sortOptions}>
            {['relevance', 'recent', 'popular'].map(sort => (
              <TouchableOpacity
                key={sort}
                style={[
                  styles.sortOption,
                  filters.sortBy === sort && styles.sortOptionActive
                ]}
                onPress={() => setFilters({ ...filters, sortBy: sort })}
                activeOpacity={0.7}
              >
                {filters.sortBy === sort && (
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.secondary]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                )}
                <Text style={[
                  styles.sortOptionText,
                  filters.sortBy === sort && styles.sortOptionTextActive
                ]}>
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.applyFiltersButton}
          onPress={() => {
            setShowFilters(false);
            if (searchQuery) performSearch(searchQuery);
          }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.applyFiltersText}>Apply Filters</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render User Card
  const renderUserCard = ({ item, index }) => (
    <Animated.View
      style={[
        styles.resultCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate('UserProfile', { userId: item.uid })}
        activeOpacity={0.9}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Image
              source={{ uri: item.avatar_url || 'https://via.placeholder.com/60' }}
              style={styles.avatar}
            />
            {item.online && <View style={styles.onlineDot} />}
            <View style={styles.cardInfo}>
              <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.userBio} numberOfLines={2}>{item.bio || 'No bio available'}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={14} color={COLORS.text.tertiary} />
                  <Text style={styles.statText}>{item.followersCount || 0} followers</Text>
                </View>
              </View>
            </View>
          </View>
          
          {renderMatchScore(item.matchScore)}
          
          {item.skills && item.skills.length > 0 && (
            <View style={styles.skillsRow}>
              {item.skills.slice(0, 3).map((skill, idx) => (
                <View key={idx} style={styles.skillPill}>
                  <Text style={styles.skillPillText}>{skill}</Text>
                </View>
              ))}
              {item.skills.length > 3 && (
                <Text style={styles.moreSkills}>+{item.skills.length - 3} more</Text>
              )}
            </View>
          )}
          
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleFollow(item.uid)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[COLORS.primary + '20', COLORS.secondary + '20']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Ionicons name="person-add" size={16} color={COLORS.primary} />
              <Text style={styles.actionButtonText}>Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleMessage(item.uid, item.name)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[COLORS.primary + '20', COLORS.secondary + '20']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Ionicons name="chatbubble" size={16} color={COLORS.primary} />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Render Project Card
  const renderProjectCard = ({ item, index }) => (
    <Animated.View
      style={[
        styles.resultCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate('ProjectDetails', { postId: item.id })}
        activeOpacity={0.9}
      >
        <View style={styles.cardContent}>
          <Text style={styles.projectTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.projectDesc} numberOfLines={3}>{item.description}</Text>
          
          {item.authorName && (
            <View style={styles.authorRow}>
              <Ionicons name="person-circle" size={16} color={COLORS.text.secondary} />
              <Text style={styles.authorName}>by {item.authorName}</Text>
            </View>
          )}
          
          {renderMatchScore(item.matchScore)}
          
          {item.skills_needed && item.skills_needed.length > 0 && (
            <View style={styles.skillsRow}>
              {item.skills_needed.slice(0, 4).map((skill, idx) => (
                <View key={idx} style={styles.skillPill}>
                  <Text style={styles.skillPillText}>{skill}</Text>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.projectStats}>
            <View style={styles.statGroup}>
              <Ionicons name="people" size={16} color={COLORS.primary} />
              <Text style={styles.statValue}>{item.team_size || 0} / {item.max_team_size || 5}</Text>
            </View>
            <View style={styles.statGroup}>
              <Ionicons name="heart" size={16} color={COLORS.error} />
              <Text style={styles.statValue}>{item.likes || 0}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Render Search Stats
  const renderSearchStats = () => {
    if (!searchQuery || results.total === 0) return null;
    
    return (
      <View style={styles.searchStats}>
        <LinearGradient
          colors={[COLORS.primary + '10', COLORS.secondary + '10']}
          style={styles.statsGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="flash" size={16} color={COLORS.primary} />
          <Text style={styles.searchStatsText}>
            {results.total} results found in {searchTime}ms
          </Text>
        </LinearGradient>
      </View>
    );
  };

  // Empty State
  const renderEmptyState = () => {
    if (loading) return null;
    
    if (!searchQuery) {
      return (
        <ScrollView 
          style={styles.emptyContainer}
          contentContainerStyle={styles.emptyContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[COLORS.primary + '20', COLORS.secondary + '20']}
            style={styles.emptyIconContainer}
          >
            <Ionicons name="search" size={48} color={COLORS.primary} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Discover Amazing Projects</Text>
          <Text style={styles.emptyText}>Search for users, projects, and collaborate!</Text>
          
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.slice(0, 5).map((query, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentItem}
                  onPress={() => {
                    setSearchQuery(query);
                    performSearch(query);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={18} color={COLORS.text.secondary} />
                  <Text style={styles.recentText}>{query}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Trending Searches */}
          {trending.length > 0 && (
            <View style={styles.trendingSection}>
              <View style={styles.trendingHeader}>
                <LinearGradient
                  colors={[COLORS.warning, COLORS.error]}
                  style={styles.trendingIcon}
                >
                  <Ionicons name="flame" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Trending Now</Text>
              </View>
              {trending.slice(0, 5).map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.trendingItem}
                  onPress={() => {
                    setSearchQuery(item.query);
                    performSearch(item.query);
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[COLORS.primary + '20', COLORS.secondary + '20']}
                    style={styles.trendingRank}
                  >
                    <Text style={styles.trendingRankText}>#{index + 1}</Text>
                  </LinearGradient>
                  <Text style={styles.trendingText}>{item.query}</Text>
                  <Text style={styles.trendingCount}>{item.count} searches</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      );
    }
    
    if (results.total === 0) {
      return (
        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={[COLORS.text.tertiary + '20', COLORS.text.tertiary + '10']}
            style={styles.emptyIconContainer}
          >
            <Ionicons name="search-outline" size={48} color={COLORS.text.tertiary} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyText}>Try different keywords or adjust your filters</Text>
        </View>
      );
    }
    
    return null;
  };

  // Main Results
  const renderResults = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }
    
    const dataToShow = activeTab === 'all' 
      ? [...results.users, ...results.projects, ...results.posts]
      : activeTab === 'users' 
        ? results.users 
        : activeTab === 'projects'
          ? results.projects
          : results.posts;
    
    if (dataToShow.length === 0) return renderEmptyState();
    
    return (
      <FlatList
        data={dataToShow}
        keyExtractor={(item, index) => item.uid || item.id || index.toString()}
        renderItem={({ item, index }) => {
          if (item.uid) return renderUserCard({ item, index });
          return renderProjectCard({ item, index });
        }}
        contentContainerStyle={styles.resultsContainer}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderSearchBar()}
      {renderSuggestions()}
      {renderTabs()}
      {renderFilters()}
      {renderSearchStats()}
      {renderResults()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  
  // Search Bar
  searchBarContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchGradient: {
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.medium,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.md,
    color: COLORS.text.primary,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  filterButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Suggestions
  suggestionsContainer: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
    ...SHADOWS.large,
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '30',
  },
  suggestionText: {
    flex: 1,
    fontSize: FONTS.md,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  
  // Tabs
  tabsContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tabsContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    paddingRight: SPACING.xl, // Ensure last item is reachable
  },
  tab: {
    paddingHorizontal: 20, // Fixed pixel for control
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  activeTab: {
    borderColor: 'transparent',
    backgroundColor: COLORS.primary, // Callback to theme
  },
  tabText: {
    fontSize: FONTS.sm,
    color: COLORS.text.secondary,
    fontWeight: '600',
    position: 'relative',
    zIndex: 1,
  },
  activeTabText: {
    color: '#FFF',
    fontWeight: '700',
  },
  
  // Filters Panel
  filtersPanel: {
    backgroundColor: COLORS.background.secondary,
    margin: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.large,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  filterTitle: {
    fontSize: FONTS.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  filterSection: {
    marginBottom: SPACING.lg,
  },
  filterLabel: {
    fontSize: FONTS.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterInput: {
    backgroundColor: COLORS.background.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.md,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skillTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
    overflow: 'hidden',
  },
  skillTagText: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: '600',
    position: 'relative',
    zIndex: 1,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sortOption: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.background.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sortOptionActive: {
    borderColor: 'transparent',
  },
  sortOptionText: {
    fontSize: FONTS.sm,
    color: COLORS.text.secondary,
    fontWeight: '600',
    position: 'relative',
    zIndex: 1,
  },
  sortOptionTextActive: {
    color: '#FFF',
  },
  applyFiltersButton: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  gradientButton: {
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  applyFiltersText: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  
  // Match Badge
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    borderWidth: 1,
  },
  matchScore: {
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  
  // Result Cards
  resultsContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  resultCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.xl,
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  cardContent: {
    padding: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
    marginRight: SPACING.md,
    borderWidth: 3,
    borderColor: COLORS.primary + '30',
  },
  onlineDot: {
    position: 'absolute',
    top: 0,
    left: 44,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    borderWidth: 3,
    borderColor: COLORS.background.secondary,
  },
  cardInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONTS.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  userBio: {
    fontSize: FONTS.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FONTS.xs,
    color: COLORS.text.tertiary,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginVertical: SPACING.md,
  },
  skillPill: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  skillPillText: {
    fontSize: FONTS.xs,
    color: COLORS.primary,
    fontWeight: '600',
  },
  moreSkills: {
    fontSize: FONTS.xs,
    color: COLORS.text.tertiary,
    alignSelf: 'center',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  actionButtonText: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: '600',
    position: 'relative',
    zIndex: 1,
  },
  
  // Project Cards
  projectTitle: {
    fontSize: FONTS.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  projectDesc: {
    fontSize: FONTS.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  authorName: {
    fontSize: FONTS.xs,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
  projectStats: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: FONTS.sm,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  
  // Search Stats
  searchStats: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  statsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  searchStatsText: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
  },
  emptyContent: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONTS.xxl,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: FONTS.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  
  // Recent & Trending
  recentSection: {
    width: '100%',
    marginTop: SPACING.xl,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  clearText: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  recentText: {
    fontSize: FONTS.md,
    color: COLORS.text.secondary,
    flex: 1,
    fontWeight: '500',
  },
  
  trendingSection: {
    width: '100%',
    marginTop: SPACING.xl,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  trendingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  trendingRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  trendingRankText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.primary,
    position: 'relative',
    zIndex: 1,
  },
  trendingText: {
    flex: 1,
    fontSize: FONTS.md,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  trendingCount: {
    fontSize: FONTS.xs,
    color: COLORS.text.tertiary,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.md,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
});
