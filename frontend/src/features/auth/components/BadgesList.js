import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS } from '../../../core/design/Theme';

export default function BadgesList({ badges }) {
  if (!badges || badges.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Badges & Achievements</Text>
      <View style={styles.grid}>
        {badges.map((badge, index) => (
          <TouchableOpacity key={index} style={styles.badge} activeOpacity={0.8}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{badge.icon || '🏅'}</Text>
            </View>
            <Text style={styles.name}>{badge.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    marginVertical: 8,
    elevation: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  badge: {
    alignItems: 'center',
    width: '30%',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  icon: {
    fontSize: 28,
  },
  name: {
    fontSize: 12,
    textAlign: 'center',
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
});
