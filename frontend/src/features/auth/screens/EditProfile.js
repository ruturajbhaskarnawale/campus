import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../../../core/api/client';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../../../core/design/Theme';
import { getCurrentUserId } from '../../../core/auth';

export default function EditProfile({ route, navigation }) {
  // Initial state from route params or defaults
  const initialProfile = route.params?.profile || {};
  
  const [name, setName] = useState(initialProfile.name || '');
  const [bio, setBio] = useState(initialProfile.bio || '');
  const [skills, setSkills] = useState(
    Array.isArray(initialProfile.skills) ? initialProfile.skills.join(', ') : (initialProfile.skills || '')
  );
  const [github, setGithub] = useState(initialProfile.github_link || '');
  const [resume, setResume] = useState(initialProfile.resume_url || '');

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const uid = await getCurrentUserId();
      const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      
      const payload = {
        name,
        bio,
        skills: skillsArray,
        github_link: github,
        resume_url: resume
      };
      
      if (uid) {
         // Use demo uid header for dev mode if we don't have full auth flow yet
         await client.put('/auth/profile', { ...payload, uid }, { headers: { 'X-Demo-Uid': uid } });
      } else {
         await client.put('/auth/profile', payload);
      }
      
      Alert.alert('Success', 'Profile updated!');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
           <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
           <Text style={styles.saveText}>{loading ? 'Saving...' : 'Done'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        
        <View style={styles.section}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput 
                style={styles.input} 
                value={name} 
                onChangeText={setName} 
                placeholder="e.g. Jane Doe"
            />
        </View>

        <View style={styles.section}>
            <Text style={styles.label}>Bio</Text>
            <TextInput 
                style={[styles.input, styles.textArea]} 
                value={bio} 
                onChangeText={setBio} 
                placeholder="Tell us about yourself..."
                multiline
                numberOfLines={4}
            />
        </View>

        <View style={styles.section}>
            <Text style={styles.label}>Skills (comma separated)</Text>
            <TextInput 
                style={styles.input} 
                value={skills} 
                onChangeText={setSkills} 
                placeholder="React, Python, Design..."
            />
        </View>

        <View style={styles.section}>
            <Text style={styles.label}>Links</Text>
            <TextInput 
                style={styles.input} 
                value={github} 
                onChangeText={setGithub} 
                placeholder="GitHub URL"
                autoCapitalize="none"
            />
            <View style={{height: 12}} />
             <TextInput 
                style={styles.input} 
                value={resume} 
                onChangeText={setResume} 
                placeholder="Resume / Portfolio URL"
                autoCapitalize="none"
            />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.light },
  header: {
    padding: SPACING.m,
    paddingTop: Platform.OS === 'android' ? 40 : SPACING.m,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  cancelText: { color: COLORS.text.secondary, fontSize: 16 },
  saveText: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
  
  form: { padding: SPACING.m },
  section: { marginBottom: SPACING.l },
  label: { fontSize: 14, color: COLORS.text.secondary, marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: RADIUS.s,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: COLORS.text.primary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
