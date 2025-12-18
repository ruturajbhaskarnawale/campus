import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../design/Theme';

export const Divider = ({ text, style }) => {
  if (text) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.line} />
        <Text style={styles.text}>{text}</Text>
        <View style={styles.line} />
      </View>
    );
  }

  return <View style={[styles.line, { width: '100%', marginVertical: 8 }, style]} />;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  text: {
    marginHorizontal: 12,
    color: COLORS.text.tertiary,
    fontSize: 14,
    fontWeight: '500',
  }
});
