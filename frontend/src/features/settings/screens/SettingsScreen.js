import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../../../core/design/Theme';
import { signOut } from '../../../core/auth';

export default function SettingsScreen({ navigation }) {
  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: async () => {
            await signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('EditProfile')}>
            <Text style={styles.rowLabel}>Edit Profile</Text>
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Notifications</Text>
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Privacy & Security</Text>
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Help Center</Text>
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>About Us</Text>
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
      
      <Text style={styles.version}>Version 1.0.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.light,
    padding: SPACING.m,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: RADIUS.m,
    marginBottom: SPACING.l,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginLeft: SPACING.m,
    marginTop: SPACING.m,
    marginBottom: SPACING.s,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLabel: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  chevron: {
    fontSize: 20,
    color: '#ccc',
  },
  logoutBtn: {
    backgroundColor: 'white',
    padding: SPACING.m,
    borderRadius: RADIUS.m,
    alignItems: 'center',
    marginTop: SPACING.s,
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: 'bold',
    fontSize: 16,
  },
  version: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: SPACING.l,
    fontSize: 12,
  },
});
