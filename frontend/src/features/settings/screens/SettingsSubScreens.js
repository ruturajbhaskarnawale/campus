
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native';
import client from '../../../core/api/client';
import { COLORS, SPACING, RADIUS } from '../../../core/design/Theme';

// --- Components ---
const SectionHeader = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const SettingToggle = ({ label, value, onValueChange, description }) => (
  <View style={styles.toggleRow}>
    <View style={{flex:1, marginRight: 8}}>
      <Text style={styles.toggleLabel}>{label}</Text>
      {description && <Text style={styles.toggleDesc}>{description}</Text>}
    </View>
    <Switch 
      value={value} 
      onValueChange={onValueChange} 
      trackColor={{ false: '#e0e0e0', true: COLORS.primary }}
    />
  </View>
);

// --- Screens ---

export const ChangePassword = ({ navigation }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
      if (newPassword !== confirmPassword) {
          Alert.alert("Error", "New passwords do not match");
          return;
      }
      if (newPassword.length < 6) {
          Alert.alert("Error", "Password must be at least 6 characters");
          return;
      }
      
      setLoading(true);
      try {
          await client.post('/auth/change-password', { oldPassword, newPassword });
          Alert.alert("Success", "Password updated successfully");
          navigation.goBack();
      } catch (err) {
          console.log(err);
          Alert.alert("Error", err.response?.data?.error || "Failed to update password");
      } finally {
          setLoading(false);
      }
  };

  return (
    <View style={styles.container}>
       <View style={styles.formGroup}>
           <Text style={styles.label}>Current Password</Text>
           <TextInput 
              style={styles.input} 
              secureTextEntry 
              value={oldPassword} 
              onChangeText={setOldPassword} 
           />
       </View>
       <View style={styles.formGroup}>
           <Text style={styles.label}>New Password</Text>
           <TextInput 
              style={styles.input} 
              secureTextEntry 
              value={newPassword} 
              onChangeText={setNewPassword} 
           />
       </View>
       <View style={styles.formGroup}>
           <Text style={styles.label}>Confirm New Password</Text>
           <TextInput 
              style={styles.input} 
              secureTextEntry 
              value={confirmPassword} 
              onChangeText={setConfirmPassword} 
           />
       </View>
       
       <TouchableOpacity 
          style={[styles.btn, loading && {opacity:0.7}]} 
          onPress={handleSubmit} 
          disabled={loading}
       >
           <Text style={styles.btnText}>{loading ? "Updating..." : "Update Password"}</Text>
       </TouchableOpacity>
    </View>
  );
};

export const PrivacySettings = () => {
    const [isPrivate, setIsPrivate] = useState(false);
    
    // Fetch initial state if we had it in user profile context, 
    // but for now we might default or fetch.
    useEffect(() => {
        // Ideally fetch current settings
        // client.get('/auth/me').then(res => setIsPrivate(res.data.is_private))
    }, []);

    const togglePrivate = async (val) => {
        setIsPrivate(val);
        try {
            await client.post('/auth/settings/privacy', { isPrivate: val });
        } catch (e) {
            Alert.alert("Error", "Failed to save setting");
            setIsPrivate(!val);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <SectionHeader title="Account Privacy" />
            <SettingToggle 
                label="Private Account" 
                value={isPrivate} 
                onValueChange={togglePrivate}
                description="Only people you approve can see your posts and profile details."
            />
             <SettingToggle 
                label="Show Activity Status" 
                value={true} 
                onValueChange={()=>{}}
                description="Allow accounts you follow to see when you were last active."
            />
             <SectionHeader title="Data" />
              <SettingToggle 
                label="Personalized Ads" 
                value={false} 
                onValueChange={()=>{}}
            />
        </ScrollView>
    );
};

export const NotificationSettings = () => {
    const [push, setPush] = useState(true);
    const [email, setEmail] = useState(false);
    
    return (
        <ScrollView style={styles.container}>
            <SectionHeader title="Push Notifications" />
            <SettingToggle label="Pause All" value={!push} onValueChange={(v)=>setPush(!v)} />
            <SettingToggle label="New Followers" value={push} onValueChange={()=>{}} />
            <SettingToggle label="Likes & Comments" value={push} onValueChange={()=>{}} />
            
            <SectionHeader title="Email Notifications" />
             <SettingToggle label="Product Emails" value={email} onValueChange={setEmail} />
             <SettingToggle label="Security Alerts" value={true} onValueChange={()=>{}} />
        </ScrollView>
    );
};

// Placeholders for others
const PlaceholderScreen = ({ title }) => (
  <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
    <Text style={{color:COLORS.text.secondary}}>{title} - Coming Soon</Text>
  </View>
);
export const HelpCenter = () => <PlaceholderScreen title="Help Center" />;
export const ReportProblem = () => <PlaceholderScreen title="Report a Problem" />;
export const DataUsage = () => <PlaceholderScreen title="Data Usage" />;


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.light, padding: SPACING.m },
  formGroup: { marginBottom: SPACING.l },
  label: { fontSize: 14, color: COLORS.text.secondary, marginBottom: 8, fontWeight:'500' },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: RADIUS.s,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: COLORS.text.primary,
  },
  btn: {
      backgroundColor: COLORS.primary,
      padding: 16,
      borderRadius: RADIUS.m,
      alignItems: 'center',
      marginTop: SPACING.m,
  },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  sectionHeader: {
      fontSize: 14, fontWeight:'bold', color:COLORS.text.secondary,
      marginTop: SPACING.m, marginBottom: SPACING.s, textTransform:'uppercase'
  },
  toggleRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: 'white', padding: 16, borderRadius: RADIUS.m,
      marginBottom: SPACING.s,
  },
  toggleLabel: { fontSize: 16, color: COLORS.text.primary },
  toggleDesc: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4 },
});
