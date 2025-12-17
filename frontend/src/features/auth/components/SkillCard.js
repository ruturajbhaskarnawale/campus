import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../../core/design/Theme';

export default function SkillCard({ skills, onEndorse }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top Skills</Text>
      {skills.map((skill, index) => (
        <View key={index} style={styles.skillRow}>
          <View style={styles.info}>
             <Text style={styles.name}>{skill.name}</Text>
             <Text style={styles.endorsements}>{skill.endorsements} endorsements</Text>
          </View>
          
          <View style={styles.barContainer}>
            <View style={[styles.bar, { width: `${skill.level}%` }]} />
          </View>
          
          <TouchableOpacity 
            style={styles.endorseBtn} 
            onPress={() => onEndorse(skill.name)}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      ))}
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
  skillRow: {
    marginBottom: 16,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  endorsements: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  barContainer: {
    height: 8,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 4,
    overflow: 'hidden',
    flex: 1,
    marginRight: 8,
    marginTop: 4,
  },
  bar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  endorseBtn: {
    position: 'absolute',
    right: -30,
    top: 15,
  }
});
