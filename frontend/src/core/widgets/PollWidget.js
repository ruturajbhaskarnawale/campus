import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS } from '../design/Theme';
import { Ionicons } from '@expo/vector-icons';

export default function PollWidget({ pollData, onVote, userVoted }) {
  const [selectedOption, setSelectedOption] = useState(null);
  
  // Format: { question: "...", options: [{text: "A", votes: 0}, ...], voters: [] }
  
  if (!pollData || !pollData.options) return null;

  const totalVotes = pollData.options.reduce((acc, curr) => acc + (curr.votes || 0), 0);
  
  const handleVote = (index) => {
    if (userVoted) return;
    setSelectedOption(index);
    if (onVote) onVote(index);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{pollData.question}</Text>
      
      {pollData.options.map((option, index) => {
        const percentage = totalVotes > 0 ? ((option.votes || 0) / totalVotes) * 100 : 0;
        const isSelected = selectedOption === index;
        
        return (
          <TouchableOpacity 
            key={index} 
            style={[styles.optionContainer, userVoted && styles.disabledOption]}
            onPress={() => handleVote(index)}
            disabled={userVoted}
          >
            {/* Progress Bar Background */}
            {userVoted && (
                <View style={[styles.progressBar, { width: `${percentage}%` }]} />
            )}
            
            <View style={styles.optionContent}>
                <Text style={[styles.optionText, isSelected && styles.selectedText]}>{option.text}</Text>
                {userVoted && <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>}
            </View>
            
            {!userVoted && isSelected && (
                 <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={{position:'absolute', right:10}} />
            )}
          </TouchableOpacity>
        );
      })}
      
      <Text style={styles.footerText}>{totalVotes} votes • {userVoted ? 'Final Results' : 'Select an option'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.m,
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.m,
    marginTop: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  question: {
    ...FONTS.h3,
    marginBottom: SPACING.m,
    color: COLORS.text.primary,
  },
  optionContainer: {
    height: 44,
    borderRadius: RADIUS.s,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.s,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFF'
  },
  disabledOption: {
      borderColor: 'transparent',
      backgroundColor: '#f5f5f5' // Light gray bg behind progress
  },
  progressBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: '#e3f2fd', // Light Blue
  },
  optionContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.m,
      zIndex: 1, // On top of progress
  },
  optionText: {
      fontWeight: '600',
      color: COLORS.text.primary,
  },
  selectedText: {
      color: COLORS.primary,
  },
  percentageText: {
      fontWeight: 'bold',
      color: COLORS.text.secondary,
  },
  footerText: {
      fontSize: 12,
      color: COLORS.text.tertiary,
      marginTop: 4,
  }
});
