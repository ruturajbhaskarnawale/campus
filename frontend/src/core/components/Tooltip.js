import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Modal } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../design/Theme';

export const Tooltip = ({ children, text, visibleProp }) => {
  const [visible, setVisible] = useState(false);
  
  // If controlled externally
  const isVisible = visibleProp !== undefined ? visibleProp : visible;

  const handleHoverIn = () => {
    if (Platform.OS === 'web') setVisible(true);
  };

  const handleHoverOut = () => {
    if (Platform.OS === 'web') setVisible(false);
  };

  const handleLongPress = () => {
    setVisible(true);
    setTimeout(() => setVisible(false), 2000); // Auto hide after 2s on mobile
  };

  return (
    <View style={{ position: 'relative', zIndex: 100 }}>
      <Pressable
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        {children}
      </Pressable>

      {isVisible && (
        <View style={styles.tooltip}>
          <Text style={styles.text}>{text}</Text>
          <View style={styles.arrow} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -8 }],
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.s,
    marginBottom: 6,
    zIndex: 1000,
    minWidth: 60,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
  },
  arrow: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0,0,0,0.8)',
  }
});
