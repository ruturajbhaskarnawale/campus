import React from 'react';
import { 
  Modal as RNModal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, RADIUS, SHADOWS } from '../design/Theme';

export const Modal = ({ 
  visible, 
  onClose, 
  title, 
  children, 
  footer 
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  if (!visible) return null;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={isDesktop ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <BlurView intensity={20} tint="dark" style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[
                    styles.contentContainer,
                    isDesktop ? styles.desktopContainer : styles.mobileContainer
                ]}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                         <Ionicons name="close" size={24} color={COLORS.text.secondary} />
                    </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={styles.body}>
                    {children}
                </View>

                {/* Footer */}
                {footer && (
                    <View style={styles.footer}>
                        {footer}
                    </View>
                )}
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </BlurView>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Fallback if blur fails or enhances it
    justifyContent: 'center', // Centered for desktop
    alignItems: 'center',
  },
  contentContainer: {
    backgroundColor: COLORS.background.card,
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  // Mobile: Bottom Sheet style
  mobileContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopLeftRadius: RADIUS.l,
    borderTopRightRadius: RADIUS.l,
    paddingBottom: 20, // Safe area
    maxHeight: '90%',
  },
  // Desktop: Centered Dialog
  desktopContainer: {
    width: 600,
    maxWidth: '90%',
    borderRadius: RADIUS.m,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  }
});
