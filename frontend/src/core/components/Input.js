import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Animated, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../design/Theme';

export const Input = ({
  label,
  value,
  onChangeText,
  error,
  secureTextEntry,
  placeholder,
  leftIcon,
  rightIcon,
  onRightIconPress,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    Animated.timing(animatedLabel, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    position: 'absolute',
    left: leftIcon ? 40 : 16,
    top: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [14, -10],
    }),
    fontSize: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [COLORS.text.tertiary, COLORS.primary],
    }),
    zIndex: 1,
    backgroundColor: COLORS.background.primary, // Cover line
    paddingHorizontal: 4,
  };

  const borderColor = error
    ? COLORS.error
    : isFocused
    ? COLORS.primary
    : COLORS.border;

  return (
    <View style={styles.container}>
      <Animated.Text style={labelStyle}>
        {label}
      </Animated.Text>
      
      <View style={[styles.inputContainer, { borderColor }]}>
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={20} 
            color={COLORS.text.tertiary} 
            style={styles.leftIcon} 
          />
        )}
        
        <TextInput
          style={[styles.input, leftIcon && { paddingLeft: 40 }]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          placeholder={isFocused ? placeholder : ''}
          placeholderTextColor={COLORS.text.tertiary}
          {...props}
        />

        {secureTextEntry ? (
            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.rightIcon}>
                <Ionicons name={isPasswordVisible ? 'eye-off' : 'eye'} size={20} color={COLORS.text.tertiary} />
            </TouchableOpacity>
        ) : rightIcon ? (
             <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
                <Ionicons name={rightIcon} size={20} color={COLORS.text.tertiary} />
            </TouchableOpacity>
        ) : null}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    position: 'relative',
  },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: RADIUS.s,
    height: 50,
    justifyContent: 'center',
    backgroundColor: COLORS.background.primary,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    color: COLORS.text.primary,
    fontSize: 16,
    ...Platform.select({
       web: { outlineStyle: 'none' }
    })
  },
  leftIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
