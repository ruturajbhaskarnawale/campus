import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../design/Theme';

export const Card = ({ children, style, onPress, variant = 'elevated' }) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.card,
        variant === 'elevated' && SHADOWS.light,
        variant === 'flat' && styles.flat,
        variant === 'outlined' && styles.outlined,
        style
      ]}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.card,
    borderRadius: RADIUS.m,
    padding: 16,
    overflow: 'hidden', // Ensures inner content respects radius
  },
  flat: {
    backgroundColor: COLORS.background.tertiary,
  },
  outlined: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  }
});
