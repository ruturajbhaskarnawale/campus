import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../core/design/Theme';

export default function SkeletonLoader({ style, variant = 'rect' }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.skeleton, style, { opacity }]}>
       {/* Shimmer effect simulated by opacity loop */}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
    borderRadius: RADIUS.s,
    overflow: 'hidden',
  },
});

export function FeedSkeleton() {
    return (
        <View style={{ padding: SPACING.m }}>
            {[1, 2, 3].map((_, i) => (
                <View key={i} style={{ marginBottom: SPACING.l, padding: SPACING.m, backgroundColor: 'white', borderRadius: RADIUS.l }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.m }}>
                        <SkeletonLoader style={{ width: 40, height: 40, borderRadius: 20, marginRight: SPACING.s }} />
                        <View>
                            <SkeletonLoader style={{ width: 120, height: 16, marginBottom: 4 }} />
                            <SkeletonLoader style={{ width: 80, height: 12 }} />
                        </View>
                    </View>
                    <SkeletonLoader style={{ width: '80%', height: 24, marginBottom: SPACING.s }} />
                    <SkeletonLoader style={{ width: '100%', height: 16, marginBottom: 8 }} />
                    <SkeletonLoader style={{ width: '90%', height: 16, marginBottom: SPACING.m }} />
                    <SkeletonLoader style={{ width: '100%', height: 200, borderRadius: RADIUS.m }} />
                </View>
            ))}
        </View>
    );
}
