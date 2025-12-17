import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../../../core/design/Theme';

export default function MessageBubble({ 
  message, 
  isOwnMessage, 
  showAvatar, 
  senderName, 
  avatar,
  onLongPress,
  onPress
}) {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderReactions = () => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) return null;
    
    // Group reactions by emoji
    const counts = {};
    Object.values(message.reactions).forEach(emoji => {
      counts[emoji] = (counts[emoji] || 0) + 1;
    });

    return (
      <View style={[styles.reactionsContainer, isOwnMessage ? styles.reactionsRight : styles.reactionsLeft]}>
        {Object.entries(counts).map(([emoji, count], index) => (
          <View key={index} style={styles.reactionPill}>
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
          </View>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    // 1. Image
    if (message.type === 'image') {
      return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => onPress && onPress(message)}>
          <Image 
            source={{ uri: message.fileUrl }} 
            style={styles.imageContent} 
            resizeMode="cover"
          />
          {message.text ? <Text style={[styles.messageText, isOwnMessage ? styles.textWhite : styles.textDark, { marginTop: 8 }]}>{message.text}</Text> : null}
        </TouchableOpacity>
      );
    }
    
    // 2. Code Block (Simple representation)
    if (message.type === 'code') {
      return (
        <View>
          <View style={styles.codeHeader}>
            <Ionicons name="code-slash" size={14} color={isOwnMessage ? 'rgba(255,255,255,0.7)' : COLORS.text.secondary} />
            <Text style={[styles.codeLang, isOwnMessage ? styles.textWhite : styles.textDark]}>{message.codeLanguage || 'Code'}</Text>
          </View>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>{message.text}</Text>
          </View>
        </View>
      );
    }
    
    // 3. Link Preview (if available)
    if (message.linkPreview) {
      return (
        <View>
          <Text style={[styles.messageText, isOwnMessage ? styles.textWhite : styles.textDark]}>{message.text}</Text>
          <TouchableOpacity 
            style={styles.linkPreview} 
            onPress={() => Linking.openURL(message.linkPreview.url)}
            activeOpacity={0.9}
          >
            {message.linkPreview.image ? (
              <Image source={{ uri: message.linkPreview.image }} style={styles.linkImage} />
            ) : null}
            <View style={styles.linkInfo}>
              <Text style={styles.linkTitle} numberOfLines={1}>{message.linkPreview.title}</Text>
              <Text style={styles.linkDesc} numberOfLines={2}>{message.linkPreview.description}</Text>
              <Text style={styles.linkUrl} numberOfLines={1}>{new URL(message.linkPreview.url).hostname}</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // 4. Default Text
    return (
      <Text style={[styles.messageText, isOwnMessage ? styles.textWhite : styles.textDark]}>
        {message.text}
      </Text>
    );
  };

  return (
    <View style={[styles.container, isOwnMessage ? styles.containerRight : styles.containerLeft]}>
      {/* Avatar for received messages */}
      {!isOwnMessage && (
        <View style={styles.avatarContainer}>
          {showAvatar ? (
            <Image source={{ uri: avatar || 'https://via.placeholder.com/40' }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
        </View>
      )}

      <View style={styles.contentContainer}>
        {/* Sender Name (Group chats) */}
        {!isOwnMessage && showAvatar && senderName && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}

        <TouchableOpacity 
          activeOpacity={0.9} 
          onLongPress={() => onLongPress && onLongPress(message)}
          delayLongPress={200}
        >
          {isOwnMessage ? (
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubble, styles.bubbleRight]}
            >
              {renderContent()}
              <View style={styles.metaContainer}>
                <Text style={[styles.timestamp, styles.textWhiteVeryLight]}>{formatTime(message.timestamp)}</Text>
                {/* Read Receipts */}
                <Ionicons 
                  name={message.status === 'seen' ? "checkmark-done" : "checkmark"} 
                  size={14} 
                  color="rgba(255,255,255,0.7)" 
                  style={{ marginLeft: 4 }}
                />
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.bubble, styles.bubbleLeft]}>
              {renderContent()}
              <View style={styles.metaContainer}>
                <Text style={[styles.timestamp, styles.textGrey]}>{formatTime(message.timestamp)}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {renderReactions()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: SPACING.md,
    width: '100%',
  },
  containerRight: {
    justifyContent: 'flex-end',
  },
  containerLeft: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    marginRight: 8,
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarPlaceholder: {
    width: 32,
  },
  contentContainer: {
    maxWidth: '75%',
  },
  bubble: {
    padding: 12,
    borderRadius: 20,
    ...SHADOWS.small,
  },
  bubbleRight: {
    borderBottomRightRadius: 4,
  },
  bubbleLeft: {
    backgroundColor: '#efefef', // Instagram Gray
    borderBottomLeftRadius: 4,
    // No border for cleaner look
  },
  messageText: {
    fontSize: FONTS.md,
    lineHeight: 22,
  },
  textWhite: {
    color: '#FFF',
  },
  textWhiteVeryLight: {
    color: 'rgba(255,255,255,0.7)',
  },
  textDark: {
    color: COLORS.text.primary,
  },
  textGrey: {
    color: COLORS.text.tertiary,
  },
  senderName: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginBottom: 4,
    marginLeft: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
  },
  
  // Rich Content Styles
  imageContent: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    paddingBottom: 4,
  },
  codeLang: {
    fontSize: 10,
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  codeBlock: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 8,
    minWidth: 180,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#FFF',
  },
  
  // Link Preview
  linkPreview: {
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  linkImage: {
    width: '100%',
    height: 100,
  },
  linkInfo: {
    padding: 8,
  },
  linkTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  linkDesc: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 10,
    color: COLORS.primary,
  },

  // Reactions
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: -8,
    zIndex: 10,
    flexWrap: 'wrap',
    gap: 4,
  },
  reactionsRight: {
    justifyContent: 'flex-end',
    marginRight: 8,
  },
  reactionsLeft: {
    justifyContent: 'flex-start',
    marginLeft: 8,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    ...SHADOWS.small,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 10,
    color: COLORS.text.secondary,
    marginLeft: 2,
    fontWeight: '600',
  },
});
