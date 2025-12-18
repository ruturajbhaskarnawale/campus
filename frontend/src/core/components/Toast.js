import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '../design/Theme';

export const Toast = ({ id, message, type = 'info', onDismiss }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 5,
      })
    ]).start();

    const timer = setTimeout(() => {
      hide();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
        if(onDismiss) onDismiss(id);
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      case 'warning': return 'warning';
      default: return 'information-circle';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success': return COLORS.success;
      case 'error': return COLORS.error;
      case 'warning': return COLORS.warning;
      default: return COLORS.secondary;
    }
  };

  return (
    <Animated.View style={[
      styles.container, 
      { opacity, transform: [{ translateY }] },
      { borderLeftColor: getColor() }
    ]}>
      <Ionicons name={getIcon()} size={24} color={getColor()} />
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity onPress={hide}>
        <Ionicons name="close" size={20} color={COLORS.text.tertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: RADIUS.m,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    ...SHADOWS.medium,
    minWidth: 300,
    maxWidth: '90%',
    alignSelf: 'center',
  },
  message: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '500',
  }
});
