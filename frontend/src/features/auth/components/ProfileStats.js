import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS } from '../../../core/design/Theme';

export default function ProfileStats({ stats, level, xp, nextXp }) {
  const progress = (xp % 1000) / 1000;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.levelCard}
      >
        <View style={styles.levelRow}>
           <Text style={styles.levelLabel}>Level {level}</Text>
           <Text style={styles.xpLabel}>{xp} / {nextXp} XP</Text>
        </View>
        <View style={styles.progressBarBg}>
           <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
           <Text style={styles.statValue}>{stats.views || 0}</Text>
           <Text style={styles.statLabel}>Views</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.statItem}>
           <Text style={styles.statValue}>{stats.reputation || 0}</Text>
           <Text style={styles.statLabel}>Reputation</Text>
        </View>
        <View style={styles.separator} />
         <View style={styles.statItem}>
           <Text style={styles.statValue}>{stats.collaborations || 0}</Text>
           <Text style={styles.statLabel}>Collabs</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0, // Container padding handled by parent now
    marginBottom: 8,
  },
  levelCard: {
    padding: 12, // Reduced padding
    borderRadius: RADIUS.lg,
    marginBottom: 16,
    ...SHADOWS.small, // Softer shadow
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center',
  },
  levelLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  xpLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    justifyContent: 'space-between',
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  separator: {
    width: 1,
    height: '80%',
    backgroundColor: COLORS.border,
  }
});
