import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, FONTS } from '../design/Theme';

export const Button = ({
  title,
  onPress,
  variant = 'primary', // primary, outline, ghost, danger
  size = 'medium', // small, medium, large
  icon, // React Node
  isLoading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  // Animation Handlers
  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  // Styles Generation
  const getContainerStyle = () => {
    switch (variant) {
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: COLORS.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: COLORS.error,
        };
      default:
        // Gradient handled separately
        return {};
    }
  };

  const getTextColor = () => {
    if (variant === 'outline') return COLORS.primary;
    if (variant === 'ghost') return COLORS.text.secondary;
    return '#fff';
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small': return { paddingVertical: 8, paddingHorizontal: 16 };
      case 'large': return { paddingVertical: 16, paddingHorizontal: 32 };
      default: return { paddingVertical: 12, paddingHorizontal: 24 };
    }
  };

  const ButtonContent = () => (
    <>
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} size="small" style={{ marginRight: 8 }} />
      ) : (
        icon && <Animated.View style={{ marginRight: 8 }}>{icon}</Animated.View>
      )}
      <Text style={[
        styles.text,
        { color: getTextColor(), fontSize: size === 'large' ? 18 : 16 },
        textStyle
      ]}>
        {title}
      </Text>
    </>
  );

  const containerStyles = [
    styles.container,
    getSizeStyle(),
    getContainerStyle(),
    (variant === 'primary') && SHADOWS.medium,
    disabled && styles.disabled,
    style,
  ];

  if (variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isLoading}
        activeOpacity={0.9}
        style={{ borderRadius: RADIUS.round }} // Wrapper for gradient radius
      >
        <Animated.View style={[{ transform: [{ scale: scaleValue }] }, ...containerStyles, { padding: 0 }]}>
            <LinearGradient
                colors={COLORS.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradient, getSizeStyle()]}
            >
                <ButtonContent />
            </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      style={{ borderRadius: RADIUS.round }}
    >
        <Animated.View style={[{ transform: [{ scale: scaleValue }] }, ...containerStyles]}>
             <ButtonContent />
        </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.round,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.round,
    width: '100%',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: '#ccc',
  },
});
