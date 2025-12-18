import React, { useState, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../core/design/Theme';

export default function TopLoadingBar() {
  const navigation = useNavigation();
  const [loadingVisible, setLoadingVisible] = useState(false);
  const loadingProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
        // Trigger generic load effect on any navigation state change
        // e.data.state might be undefined on some events, but 'state' event fires on nav
        triggerAnimation();
    });
    return unsubscribe;
  }, [navigation]);

  const triggerAnimation = () => {
     setLoadingVisible(true);
     loadingProgress.setValue(0);
     Animated.timing(loadingProgress, {
         toValue: 1,
         duration: 800,
         useNativeDriver: false
     }).start(() => {
         setTimeout(() => {
            setLoadingVisible(false);
            loadingProgress.setValue(0);
         }, 200);
     });
  };

  if (!loadingVisible) return null;

  return (
    <View style={styles.container}>
        <Animated.View style={[styles.bar, {
              width: loadingProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
              })
        }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      zIndex: 9999,
      elevation: 10,
  },
  bar: {
      height: '100%',
      backgroundColor: COLORS.primary,
  }
});
