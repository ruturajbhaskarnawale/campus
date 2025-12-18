import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, FONTS } from '../design/Theme';

const stringToColor = (str) => {
  if (!str) return COLORS.primary;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const getInitials = (name) => {
  if (!name) return '?';
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2);
  return initials.toUpperCase();
};

export const Avatar = ({ source, name, size = 40, style }) => {
  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: size / 2,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: source ? COLORS.background.tertiary : stringToColor(name),
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    text: {
      color: '#fff',
      fontWeight: '600',
      fontSize: size * 0.4,
    }
  });

  if (source && source.uri) {
    return (
      <View style={[styles.container, style]}>
        <Image source={source} style={styles.image} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>{getInitials(name)}</Text>
    </View>
  );
};
