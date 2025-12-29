
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../../../core/design/Theme';
import { signOut } from '../../../core/auth';

const SettingsItem = ({ label, icon, onPress, value, type = 'link', onToggle, isDestructive }) => (
  <TouchableOpacity 
    style={styles.row} 
    onPress={onPress} 
    disabled={type === 'toggle'}
    activeOpacity={type === 'toggle' ? 1 : 0.7}
  >
    <View style={styles.rowLeft}>
      {icon && <Feather name={icon} size={20} color={isDestructive ? COLORS.error : COLORS.text.secondary} style={styles.icon} />}
      <Text style={[styles.rowLabel, isDestructive && styles.destructiveLabel]}>{label}</Text>
    </View>
    <View style={styles.rowRight}>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {type === 'toggle' && (
        <Switch 
          value={value} 
          onValueChange={onToggle} 
          trackColor={{ false: '#e0e0e0', true: COLORS.primary }}
        />
      )}
      {type === 'link' && <Feather name="chevron-right" size={20} color="#ccc" />}
    </View>
  </TouchableOpacity>
);

const SettingsSection = ({ title, children }) => (
  <View style={styles.sectionContainer}>
    {title && <Text style={styles.sectionTitle}>{title}</Text>}
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

export default function SettingsScreen({ navigation }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
      loadSettings();
  }, []);

  const loadSettings = async () => {
      try {
          const res = await client.get('/settings');
          setIsDarkMode(res.data.theme === 'dark');
          setPushEnabled(res.data.push_notifications);
      } catch (ignore) {}
  };

  const toggleTheme = async (val) => {
      setIsDarkMode(val);
      try {
          await client.put('/settings', { theme: val ? 'dark' : 'light' });
      } catch(e) { setIsDarkMode(!val); }
  };

  const togglePush = async (val) => {
      setPushEnabled(val);
      try {
          await client.put('/settings', { push_notifications: val });
      } catch(e) { setPushEnabled(!val); }
  };

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: async () => {
            await signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }}
    ]);
  };

  const handleDeleteAccount = () => {
      Alert.alert(
          "Delete Account", 
          "This action is irreversible. All your data will be lost.",
          [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => Alert.alert("Account Deleted", "Your account has been scheduled for deletion.") }
          ]
      );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <SettingsSection title="Account">
            <SettingsItem 
                label="Edit Profile" 
                icon="user" 
                onPress={() => navigation.navigate('EditProfile')} 
            />
            <SettingsItem 
                label="Change Password" 
                icon="lock" 
                onPress={() => navigation.navigate('ChangePassword')} 
            />
            <SettingsItem 
                label="Privacy & Security" 
                icon="shield" 
                onPress={() => navigation.navigate('PrivacySettings')} 
            />
            <SettingsItem 
                label="Push Notifications" 
                icon="bell" 
                type="toggle"
                value={pushEnabled}
                onToggle={togglePush}
            />
             <SettingsItem 
                label="More Notification Settings" 
                onPress={() => navigation.navigate('NotificationSettings')} 
            />
        </SettingsSection>

        <SettingsSection title="Preferences">
            <SettingsItem 
                label="Dark Mode" 
                icon="moon" 
                type="toggle"
                value={isDarkMode}
                onToggle={toggleTheme}
            />
            <SettingsItem 
                label="Language" 
                icon="globe" 
                value="English" 
                onPress={() => Alert.alert("Language", "Language selection coming soon.")} 
            />
        </SettingsSection>

        <SettingsSection title="Support">
            <SettingsItem 
                label="Help Center" 
                icon="help-circle" 
                onPress={() => navigation.navigate('HelpCenter')} 
            />
            <SettingsItem 
                label="Report a Problem" 
                icon="alert-triangle" 
                onPress={() => navigation.navigate('ReportProblem')} 
            />
             <SettingsItem 
                label="Data & Storage" 
                icon="database" 
                onPress={() => navigation.navigate('DataUsage')} 
            />
        </SettingsSection>

        <SettingsSection>
            <SettingsItem 
                label="Log Out" 
                icon="log-out" 
                onPress={handleLogout} 
                isDestructive 
            />
             <SettingsItem 
                label="Delete Account" 
                icon="trash-2" 
                onPress={handleDeleteAccount} 
                isDestructive 
            />
        </SettingsSection>
        
        <Text style={styles.version}>Campus App v1.0.0 (Build 2025)</Text>
        <View style={{height: 20}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.light,
  },
  scrollContent: {
      padding: SPACING.m,
  },
  sectionContainer: {
    marginBottom: SPACING.l,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: SPACING.s,
    marginLeft: SPACING.s,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionContent: {
    backgroundColor: 'white',
    borderRadius: RADIUS.m,
    overflow: 'hidden',
    ...SHADOWS.light,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  icon: {
      marginRight: SPACING.m,
  },
  rowLabel: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  destructiveLabel: {
      color: COLORS.error,
  },
  rowValue: {
      fontSize: 15,
      color: COLORS.text.secondary,
      marginRight: 8,
  },
  version: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: SPACING.s,
    fontSize: 12,
  },
});
