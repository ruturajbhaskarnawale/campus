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
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';
import { SPACING, FONTS, RADIUS, SHADOWS } from '../../../core/design/Theme';
import { useTheme } from '../../../core/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SearchScreen({ navigation }) {
  const { colors, isDark } = useTheme();
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
    sortBy: 'relevance',
    universityYear: null,
    department: null,
    datePosted: null,
    saveSearch: false
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
        sort: filters.sortBy,
        year: filters.universityYear,
        dept: filters.department
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
  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Load recent searches error:', error);
    }
  };

  const saveToRecentSearches = async (query) => {
    try {
      let recent = [...recentSearches];
      recent = recent.filter(q => q !== query);
      recent.unshift(query);
      recent = recent.slice(0, 10);
      setRecentSearches(recent);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(recent));
    } catch (error) {
      console.error('Save recent search error:', error);
    }
  };

  const clearRecentSearches = async () => {
    try {
        setRecentSearches([]);
        await AsyncStorage.removeItem('recentSearches');
    } catch (e) {}
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
    
    const color = score >= 70 ? colors.success || '#4caf50' : score >= 40 ? colors.warning || '#ff9800' : colors.error || '#f44336';
    
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
        colors={[colors.primary, colors.secondary || colors.primary]}
        style={styles.searchGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={22} color={colors.text.secondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Search users, projects, or posts..."
            value={searchQuery}
            onChangeText={handleSearchInput}
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={22} color={colors.text.secondary} />
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
      <Animated.View style={[styles.suggestionsContainer, { opacity: fadeAnim, backgroundColor: colors.background.secondary }]}>
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
            <Ionicons name="search" size={16} color={colors.primary} />
            <Text style={[styles.suggestionText, { color: colors.text.primary }]}>{suggestion}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.text.tertiary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </Animated.View>
    );
  };

  // Render Tabs
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
              style={[
                  styles.tab, 
                  { backgroundColor: colors.background.tertiary },
                  activeTab === item.id && { backgroundColor: isDark ? colors.primary + '20' : '#e3f2fd', borderColor: colors.primary }
              ]}
              onPress={() => {
                setActiveTab(item.id);
                if (searchQuery) performSearch(searchQuery);
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                  styles.tabText, 
                  { color: colors.text.secondary },
                  activeTab === item.id && { color: colors.primary, fontWeight: '700' }
              ]}>
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
      <Animated.View style={[styles.filtersPanel, { opacity: fadeAnim, backgroundColor: colors.background.secondary }]}>
        <View style={styles.filterHeader}>
          <Text style={[styles.filterTitle, { color: colors.text.primary }]}>Advanced Filters</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ maxHeight: 400 }}>
            {/* Skills Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text.secondary }]}>Skills</Text>
              <View style={[styles.skillsInput, { backgroundColor: colors.background.tertiary }]}>
                <TextInput
                  style={[styles.filterInput, { color: colors.text.primary }]}
                  placeholder="e.g. React, Python..."
                  placeholderTextColor={colors.text.tertiary}
                  onSubmitEditing={(e) => {
                    const skill = e.nativeEvent.text.trim();
                    if (skill && !filters.skills.includes(skill)) {
                      setFilters({ ...filters, skills: [...filters.skills, skill] });
                      e.target.clear();
                    }
                  }}
                />
              </View>
              <View style={styles.skillTags}>
                {filters.skills.map((skill, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.skillTag, { backgroundColor: colors.primary + '15' }]} 
                    onPress={() => setFilters({...filters, skills: filters.skills.filter(s => s !== skill)})}
                  >
                     <Text style={[styles.skillTagText, { color: colors.primary }]}>{skill} ×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* University Year */}
            <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text.secondary }]}>University Year</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                    {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Grad'].map(year => (
                        <TouchableOpacity 
                            key={year} 
                            style={[
                                styles.filterChip, 
                                { backgroundColor: colors.background.tertiary },
                                filters.universityYear === year && { backgroundColor: isDark ? colors.primary + '20' : '#e3f2fd' }
                            ]}
                            onPress={() => setFilters({...filters, universityYear: filters.universityYear === year ? null : year})}
                        >
                            <Text style={[
                                styles.filterChipText, 
                                { color: colors.text.primary },
                                filters.universityYear === year && { color: colors.primary, fontWeight: '600' }
                            ]}>{year}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Department */}
            <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text.secondary }]}>Department</Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                    {['CS', 'IT', 'E&TC', 'Mech', 'Civil', 'AI&DS'].map(dept => (
                        <TouchableOpacity 
                            key={dept} 
                            style={[
                                styles.filterChip, 
                                { backgroundColor: colors.background.tertiary },
                                filters.department === dept && { backgroundColor: isDark ? colors.primary + '20' : '#e3f2fd' }
                            ]}
                            onPress={() => setFilters({...filters, department: filters.department === dept ? null : dept})}
                        >
                            <Text style={[
                                styles.filterChipText, 
                                { color: colors.text.primary },
                                filters.department === dept && { color: colors.primary, fontWeight: '600' }
                            ]}>{dept}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Date Posted */}
            <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text.secondary }]}>Date Posted</Text>
                <View style={styles.sortOptions}>
                    {['Any Time', 'Past 24h', 'Past Week', 'Past Month'].map(date => (
                        <TouchableOpacity 
                            key={date} 
                            style={[
                                styles.sortOption, 
                                { backgroundColor: colors.background.tertiary },
                                filters.datePosted === date && { backgroundColor: isDark ? colors.primary + '20' : '#e3f2fd', borderColor: colors.primary }
                            ]}
                            onPress={() => setFilters({...filters, datePosted: date})}
                        >
                            <Text style={[
                                styles.sortOptionText, 
                                { color: colors.text.secondary },
                                filters.datePosted === date && { color: colors.primary, fontWeight: '600' }
                            ]}>{date}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            
            {/* Sort Options */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text.secondary }]}>Sort By</Text>
              <View style={styles.sortOptions}>
                {['relevance', 'recent', 'popular'].map(sort => (
                  <TouchableOpacity
                    key={sort}
                    style={[
                      styles.sortOption,
                      { backgroundColor: colors.background.tertiary },
                      filters.sortBy === sort && { backgroundColor: isDark ? colors.primary + '20' : '#e3f2fd', borderColor: colors.primary }
                    ]}
                    onPress={() => setFilters({ ...filters, sortBy: sort })}
                  >
                    <Text style={[
                      styles.sortOptionText,
                      { color: colors.text.secondary },
                      filters.sortBy === sort && { color: colors.primary, fontWeight: '600' }
                    ]}>
                      {sort.charAt(0).toUpperCase() + sort.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Save Search Toggle */}
            <View style={styles.saveSearchRow}>
                <Text style={[styles.saveSearchText, { color: colors.text.primary }]}>Alert me for new results</Text>
                <TouchableOpacity onPress={() => setFilters({...filters, saveSearch: !filters.saveSearch})}>
                    <Ionicons name={filters.saveSearch ? "toggle" : "toggle-outline"} size={32} color={filters.saveSearch ? colors.primary : colors.text.tertiary} />
                </TouchableOpacity>
            </View>
        </ScrollView>
        
        <TouchableOpacity
          style={styles.applyFiltersButton}
          onPress={() => {
            setShowFilters(false);
            if (searchQuery) performSearch(searchQuery);
          }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary || colors.primary]}
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

  // Render User Card (Redesigned)
  const renderUserCard = ({ item, index }) => (
    <Animated.View
      style={[
        styles.resultCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: colors.background.card,
          borderColor: colors.border
        }
      ]}
    >
      <TouchableOpacity
        style={styles.cardInner}
        onPress={() => navigation.navigate('ProfileDetail', { userId: item.uid })}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeaderRow}>
          <Image
            source={{ uri: item.avatar_url || 'https://via.placeholder.com/60' }}
            style={styles.avatarLarge}
          />
          <View style={styles.cardMainInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.userNameTitle, { color: colors.text.primary }]}>{item.name}</Text>
              {item.online && <View style={styles.onlineBadge} />}
            </View>
            <Text style={[styles.userRoleText, { color: colors.text.secondary }]} numberOfLines={1}>{item.bio || 'Ready to collaborate'}</Text>
            <View style={styles.miniStatsRow}>
              <Ionicons name="people-outline" size={12} color={colors.text.tertiary} />
              <Text style={[styles.miniStatText, { color: colors.text.tertiary }]}>{item.followersCount || 0} followers</Text>
              <View style={styles.dotSeparator} />
              <Ionicons name="star-outline" size={12} color={colors.text.tertiary} />
              <Text style={[styles.miniStatText, { color: colors.text.tertiary }]}>{item.xp || 0} XP</Text>
            </View>
          </View>
          {renderMatchScore(item.matchScore)}
        </View>

        {item.skills && item.skills.length > 0 && (
          <View style={styles.skillTagsRow}>
            {item.skills.slice(0, 3).map((skill, idx) => (
              <View key={idx} style={[styles.skillTagSmall, { backgroundColor: colors.background.tertiary }]}>
                <Text style={[styles.skillTagTextSmall, { color: colors.text.secondary }]}>{skill}</Text>
              </View>
            ))}
            {item.skills.length > 3 && (
              <Text style={[styles.moreSkillsText, { color: colors.text.tertiary }]}>+{item.skills.length - 3}</Text>
            )}
          </View>
        )}

        <View style={styles.cardActionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnPrimary, { backgroundColor: colors.primary }]} 
            onPress={() => handleFollow(item.uid)}
          >
            <Text style={styles.actionBtnTextPrimary}>Connect</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnSecondary, { backgroundColor: colors.background.tertiary }]} 
            onPress={() => handleMessage(item.uid, item.name)}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Render Project Card (Redesigned)
  const renderProjectCard = ({ item, index }) => (
    <Animated.View
      style={[
        styles.resultCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: colors.background.card,
          borderColor: colors.border
        }
      ]}
    >
      <TouchableOpacity
        style={styles.cardInner}
        onPress={() => navigation.navigate('ProjectDetails', { postId: item.id })}
        activeOpacity={0.9}
      >
        <View style={styles.projectHeaderRow}>
          <View style={[styles.projectIconPlaceholder, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="rocket-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.projectTitleText, { color: colors.text.primary }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.projectAuthorText, { color: colors.text.tertiary }]}>by {item.authorName || 'Unknown'}</Text>
          </View>
          {renderMatchScore(item.matchScore)}
        </View>

        <Text style={[styles.projectDescText, { color: colors.text.secondary }]} numberOfLines={2}>{item.description}</Text>

        <View style={styles.projectFooterRow}>
          <View style={[styles.projectStatBadge, { backgroundColor: colors.background.tertiary }]}>
            <Ionicons name="people" size={12} color={colors.primary} />
            <Text style={[styles.projectStatText, { color: colors.text.primary }]}>{item.team_size || 0}/{item.max_team_size || 5}</Text>
          </View>
          <View style={[styles.projectStatBadge, { backgroundColor: colors.background.tertiary }]}>
            <Ionicons name="heart" size={12} color={colors.error || '#f44336'} />
            <Text style={[styles.projectStatText, { color: colors.text.primary }]}>{item.likes || 0}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.viewDetailsBtn}>
            <Text style={[styles.viewDetailsText, { color: colors.primary }]}>View</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.primary} />
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
         <Text style={[styles.searchStatsSimpleText, { color: colors.text.tertiary }]}>
            Found {results.total} results in {searchTime}ms
         </Text>
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
            colors={[colors.primary + '20', colors.secondary + '20']}
            style={styles.emptyIconContainer}
          >
            <Ionicons name="search" size={48} color={colors.primary} />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Discover Amazing Projects</Text>
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>Search for users, projects, and collaborate!</Text>
          
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.slice(0, 5).map((query, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.recentItem, { backgroundColor: colors.background.card }]}
                  onPress={() => {
                    setSearchQuery(query);
                    performSearch(query);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={18} color={colors.text.secondary} />
                  <Text style={[styles.recentText, { color: colors.text.primary }]}>{query}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Trending Searches */}
          {trending.length > 0 && (
            <View style={styles.trendingSection}>
              <View style={styles.trendingHeader}>
                <LinearGradient
                  colors={[colors.warning || '#ff9800', colors.error || '#f44336']}
                  style={styles.trendingIcon}
                >
                  <Ionicons name="flame" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Trending Now</Text>
              </View>
              {trending.slice(0, 5).map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.trendingItem, { backgroundColor: colors.background.card }]}
                  onPress={() => {
                    setSearchQuery(item.query);
                    performSearch(item.query);
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[colors.primary + '20', colors.secondary + '20']}
                    style={styles.trendingRank}
                  >
                    <Text style={[styles.trendingRankText, { color: colors.primary }]}>#{index + 1}</Text>
                  </LinearGradient>
                  <Text style={[styles.trendingText, { color: colors.text.primary }]}>{item.query}</Text>
                  <Text style={[styles.trendingCount, { color: colors.text.tertiary }]}>{item.count} searches</Text>
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
            colors={[colors.text.tertiary + '20', colors.text.tertiary + '10']}
            style={styles.emptyIconContainer}
          >
            <Ionicons name="search-outline" size={48} color={colors.text.tertiary} />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Results Found</Text>
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>Try different keywords or adjust your filters</Text>
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Searching...</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
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
  },
  
  // Search Bar
  searchBarContainer: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
  },
  searchGradient: {
    borderRadius: RADIUS.lg,
    padding: SPACING.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    ...SHADOWS.medium,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: RADIUS.m,
    paddingHorizontal: SPACING.m,
    height: 44,
    gap: SPACING.s,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.md,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.m,
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
    marginHorizontal: SPACING.m,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.s,
    ...SHADOWS.large,
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  suggestionText: {
    marginLeft: SPACING.m,
    fontSize: 14,
  },
  
  // Tabs
  tabsContainer: {
    marginTop: SPACING.s,
    maxHeight: 50,
  },
  tabsContent: {
    paddingHorizontal: SPACING.m,
    paddingVertical: 5,
    gap: SPACING.s,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Filters Panel
  filtersPanel: {
    position: 'absolute',
    top: 70, // Below header
    left: 20,
    right: 20,
    borderRadius: RADIUS.ls,
    padding: SPACING.m,
    zIndex: 100,
    ...SHADOWS.large,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterSection: {
    marginBottom: SPACING.m,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  skillsInput: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  filterInput: { fontSize: 14 },
  skillTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  skillTagText: { fontSize: 12, fontWeight: '600' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  filterChipText: { fontSize: 12 },
  sortOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  sortOptionText: { fontSize: 12 },
  saveSearchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  saveSearchText: { fontSize: 14, fontWeight: '500' },
  applyFiltersButton: { marginTop: 20, borderRadius: RADIUS.m, overflow: 'hidden' },
  gradientButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, gap: 8 },
  applyFiltersText: { color: '#FFF', fontWeight: 'bold' },

  // Stats
  searchStats: { paddingHorizontal: SPACING.m, marginVertical: 8 },
  searchStatsSimpleText: { fontSize: 12, textAlign: 'center' },
  
  // Empty State and Trending
  emptyContainer: { flex: 1, paddingTop: 30 },
  emptyContent: { paddingHorizontal: SPACING.m, paddingBottom: 50 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  emptyText: { fontSize: 16, textAlign: 'center', marginBottom: 40 },
  recentSection: { marginBottom: 30 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  clearText: { fontWeight: '600', fontSize: 14 },
  recentItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10, gap: 12 },
  recentText: { fontSize: 16 },
  trendingSection: { marginBottom: 30 },
  trendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  trendingIcon: { padding: 6, borderRadius: 8 },
  trendingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10 },
  trendingRank: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 12 },
  trendingRankText: { fontWeight: 'bold', fontSize: 12 },
  trendingText: { fontSize: 16, fontWeight: '600', flex: 1 },
  trendingCount: { fontSize: 12 },

  // List Items
  resultsContainer: { padding: SPACING.m },
  resultCard: { marginBottom: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cardInner: { padding: 16 },
  
  // User Card
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarLarge: { width: 44, height: 44, borderRadius: 22 },
  cardMainInfo: { flex: 1, marginHorizontal: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userNameTitle: { fontSize: 16, fontWeight: 'bold' },
  onlineBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4caf50' },
  userRoleText: { fontSize: 13, marginTop: 2 },
  miniStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  miniStatText: { fontSize: 12 },
  dotSeparator: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#ccc' },
  matchBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4, borderWidth: 1 },
  matchScore: { fontSize: 12, fontWeight: 'bold' },
  skillTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  skillTagSmall: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  skillTagTextSmall: { fontSize: 11 },
  moreSkillsText: { fontSize: 11, alignSelf: 'center' },
  cardActionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtnPrimary: {},
  actionBtnSecondary: { flex: 0.3 },
  actionBtnTextPrimary: { color: '#FFF', fontWeight: '600' },

  // Project Card
  projectHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  projectIconPlaceholder: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  projectTitleText: { fontSize: 16, fontWeight: 'bold' },
  projectAuthorText: { fontSize: 12 },
  projectDescText: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  projectFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  projectStatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  projectStatText: { fontSize: 12, fontWeight: '600' },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDetailsText: { fontSize: 12, fontWeight: '700' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  loadingText: { marginTop: 10, fontSize: 14 }
});
