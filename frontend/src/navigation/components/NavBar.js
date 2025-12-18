import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  useWindowDimensions, 
  Animated,
  Easing
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../../core/design/Theme';
import { useNavigationContext } from '../../context/NavigationContext';

import { useTheme } from '../../core/contexts/ThemeContext';

const MAX_WIDTH_WEB = 1200;

export default function NavBar({ state, descriptors, navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 768;
  const { isTabBarVisible } = useNavigationContext();
  const { colors, isDark, toggleTheme } = useTheme(); // Theme Hook
  
  // Animation for Hide on Scroll
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isTabBarVisible ? 0 : 100,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [isTabBarVisible]);

  // Render Tab Item
  const renderTab = (route, index) => {
    const { options } = descriptors[route.key];
    const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;

    const isFocused = state.index === index;
    
    // Icon Mapping
    let iconName = 'ellipse-outline';
    if (route.name === 'Feed') iconName = isFocused ? 'home' : 'home-outline';
    if (route.name === 'Search') iconName = isFocused ? 'search' : 'search-outline';
    if (route.name === 'Notifications') iconName = isFocused ? 'notifications' : 'notifications-outline';
    if (route.name === 'Create') iconName = isFocused ? 'add-circle' : 'add-circle-outline';
    if (route.name === 'Messages') iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline';
    if (route.name === 'Profile') iconName = isFocused ? 'person' : 'person-outline';

    const badgeCount = route.name === 'Messages' ? 3 : (route.name === 'Notifications' ? 5 : 0);

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={onPress}
        style={[
            styles.tabItem, 
            isDesktop && styles.tabItemDesktop,
            isFocused && isDesktop && { backgroundColor: colors.primary + '10' }
        ]}
      >
        <View style={[
            styles.iconWrapper, 
            isFocused && !isDesktop && styles.activeGlow, // We might need to adjust glow for dark mode
            isFocused && !isDesktop && { backgroundColor: colors.primary + '15', shadowColor: colors.primary }
        ]}>
            <Ionicons 
                name={iconName} 
                size={isDesktop ? 22 : 24} 
                color={isFocused ? colors.primary : colors.text.secondary} 
            />
            {badgeCount > 0 && !isFocused && (
                <View style={[styles.badge, { borderColor: colors.background.secondary }]}>
                    <Text style={styles.badgeText}>{badgeCount}</Text>
                </View>
            )}
        </View>
        
        {isDesktop && (
            <Text style={[
                styles.labelDesktop, 
                { color: isFocused ? colors.primary : colors.text.secondary }
            ]}>
                {label}
            </Text>
        )}
      </TouchableOpacity>
    );
  };

  // -------------------------
  // DESKTOP LAYOUT (Top Bar)
  // -------------------------
  if (isDesktop) {
      return (
          <View style={[
              styles.desktopContainer, 
              { paddingTop: insets.top, backgroundColor: colors.background.secondary, borderBottomColor: colors.border }
          ]}>
              <View style={styles.desktopContent}>
                  {/* Logo */}
                  <TouchableOpacity onPress={() => navigation.navigate('Feed')}>
                      <Text style={[styles.logo, { color: colors.text.primary }]}>
                          Campus<Text style={{color: colors.primary}}>Hub</Text>
                      </Text>
                  </TouchableOpacity>

                  {/* Tabs */}
                  <View style={styles.desktopTabs}>
                       {state.routes.map((route, index) => renderTab(route, index))}
                  </View>

                  {/* Right Actions */}
                  <View style={styles.desktopProfile}>
                      {/* Theme Toggle */}
                      <TouchableOpacity onPress={toggleTheme} style={{ padding: 8 }}>
                          <Ionicons name={isDark ? "sunny" : "moon"} size={20} color={colors.text.secondary} />
                      </TouchableOpacity>

                      <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                          <Ionicons name="person" color="#fff" size={16} />
                      </View>
                      <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
                  </View>
              </View>
          </View>
      );
  }

  // -------------------------
  // MOBILE LAYOUT (Bottom Bar)
  // -------------------------
  return (
    <Animated.View 
        style={[
            styles.mobileContainer, 
            { 
                transform: [{ translateY: slideAnim }],
                paddingBottom: insets.bottom 
            }
        ]}
    >
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
          <View style={styles.mobileTabs}>
               {state.routes.map((route, index) => renderTab(route, index))}
          </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Desktop
  desktopContainer: {
     position: 'absolute',
     top: 0,
     left: 0,
     right: 0,
     backgroundColor: '#fff', // Use solid white to hide underlay content
     borderBottomWidth: 1,
     borderBottomColor: '#f0f0f0',
     zIndex: 1000,
     ...SHADOWS.small,
  },
  desktopContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      maxWidth: MAX_WIDTH_WEB,
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: 24,
      height: 64,
  },
  logo: {
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -1,
  },
  desktopTabs: {
      flexDirection: 'row',
      gap: 24, // Increased gap
      flex: 1, // Allow taking up space
      justifyContent: 'center', // Center tabs
  },
  tabItemDesktop: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      minWidth: 90, // Ensure minimum width so text doesn't scrunch
      justifyContent: 'center',
  },
  tabItemDesktopActive: {
      backgroundColor: COLORS.primary + '10', 
  },
  labelDesktop: {
      marginLeft: 8,
      fontWeight: '600',
      fontSize: 14,
  },
  desktopProfile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      cursor: 'pointer', // Web
  },
  avatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
  },

  // Mobile
  mobileContainer: {
      position: 'absolute',
      bottom: 0,
      left: 20, // Floating effect
      right: 20,
      marginBottom: 20,
      borderRadius: 30, // Pill shape
      overflow: 'hidden',
      ...SHADOWS.medium,
      elevation: 5,
  },
  blurContainer: {
      width: '100%',
      paddingVertical: 12, // Taller pill
      paddingHorizontal: 10,
  },
  mobileTabs: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
  },
  tabItem: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 50,
      height: 50,
  },
  iconWrapper: {
      position: 'relative',
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
  },
  activeGlow: {
      backgroundColor: COLORS.primary + '15', // Subtle glow background
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
  },
  badge: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: '#ff3b30',
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: '#fff',
  },
  badgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: 'bold',
      paddingHorizontal: 3,
  },
});
