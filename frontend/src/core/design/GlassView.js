import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, RADIUS } from './Theme';

/**
 * A container that provides a Glassmorphism effect.
 * @param {object} props
 * @param {number} props.intensity - The intensity of the blur (0-100). Default 50.
 * @param {object} props.style - Additional styles.
 * @param {React.ReactNode} props.children - Child components.
 */
export default function GlassView({ intensity = 50, style, children }) {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} tint="light" style={styles.blur}>
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.l,
    overflow: 'hidden',
    backgroundColor: COLORS.glass.light, // Fallback / Base tint
    borderColor: COLORS.glass.border,
    borderWidth: 1,
  },
  blur: {
    padding: 16, // Default padding
    width: '100%',
    height: '100%',
  }
});
