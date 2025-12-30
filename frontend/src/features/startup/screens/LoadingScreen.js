import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../core/contexts/ThemeContext';
import { FONTS } from '../../../core/design/Theme';

const { width } = Dimensions.get('window');

export default function LoadingScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        // Start Animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            })
        ]).start();

        // Navigate after delay
        const timer = setTimeout(() => {
            // Check if user is logged in or not? 
            // For now, let's assume we go to Login first as per App.js structure, 
            // or if there is auth logic it might redirect.
            // But App.js has "Login" as first screen usually.
            // Let's replace to 'Login' to avoid back button to loading screen.
            navigation.replace('Login');
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
                <Ionicons 
                    name="school" 
                    size={80} 
                    color={colors.primary} 
                    style={{ marginBottom: 20 }}
                />
                <Text style={[styles.logoText, { color: colors.text.primary }]}>Campus Hub</Text>
                <Text style={[styles.tagline, { color: colors.text.secondary }]}>Connect. Collaborate. Create.</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 1,
        fontFamily: FONTS.header, // Ensure this exists or fallback
    },
    tagline: {
        marginTop: 10,
        fontSize: 14,
        letterSpacing: 0.5,
    }
});
