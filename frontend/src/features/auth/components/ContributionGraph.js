import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS } from '../../../core/design/Theme';

export default function ContributionGraph({ data, title = "Contributions" }) {
  // data is { "2023-10-01": 5, ... }
  
  // Generate last 100 days for mobile view
  const days = [];
  const today = new Date();
  
  for (let i = 0; i < 105; i++) { // 15 weeks * 7 days
    const d = new Date(today);
    d.setDate(d.getDate() - (104 - i));
    const iso = d.toISOString().split('T')[0];
    const count = data[iso] || 0;
    
    // Determine color intensity
    let color = COLORS.background.tertiary; // default
    if (count > 0) color = '#9be9a8';
    if (count > 2) color = '#40c463';
    if (count > 4) color = '#30a14e';
    if (count > 7) color = '#216e39';
    
    days.push({ date: iso, color, count });
  }

  // Convert to cols (weeks)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.graph}>
          {weeks.map((week, wIndex) => (
            <View key={wIndex} style={styles.col}>
              {week.map((day, dIndex) => (
                <View 
                  key={day.date} 
                  style={[styles.box, { backgroundColor: day.color }]}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        <View style={[styles.boxSmall, { backgroundColor: COLORS.background.tertiary }]} />
        <View style={[styles.boxSmall, { backgroundColor: '#9be9a8' }]} />
        <View style={[styles.boxSmall, { backgroundColor: '#40c463' }]} />
        <View style={[styles.boxSmall, { backgroundColor: '#30a14e' }]} />
        <View style={[styles.boxSmall, { backgroundColor: '#216e39' }]} />
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: COLORS.text.primary,
  },
  graph: {
    flexDirection: 'row',
    gap: 4,
  },
  col: {
    gap: 4,
  },
  box: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  boxSmall: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginHorizontal: 4,
  }
});
