
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../../../core/design/Theme';

export default function ForgotPasswordScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = () => {
        if (!email) {
            Alert.alert("Error", "Please enter your email address.");
            return;
        }
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            Alert.alert("Link Sent", "If an account exists with this email, you will receive a password reset link shortly.", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        }, 1500);
    };

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="lock-open-outline" size={50} color="#fff" />
                </View>
                
                <Text style={styles.title}>Trouble Logging In?</Text>
                <Text style={styles.subtitle}>Enter your email, phone, or username and we'll send you a link to get back into your account.</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email, Phone, or Username"
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                />

                <TouchableOpacity style={styles.btn} onPress={handleReset} disabled={loading}>
                    <Text style={styles.btnText}>{loading ? "Sending..." : "Send Login Link"}</Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                    <View style={styles.line} />
                    <Text style={styles.or}>OR</Text>
                    <View style={styles.line} />
                </View>

                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.createAccount}>Create New Account</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.footer} onPress={() => navigation.goBack()}>
                <Text style={styles.footerText}>Back to Login</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    content: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' },
    backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
    
    iconContainer: { 
        width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#fff', 
        justifyContent: 'center', alignItems: 'center', marginBottom: 20 
    },
    title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
    subtitle: { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
    
    input: {
        width: '100%', height: 50, backgroundColor: '#121212', borderRadius: RADIUS.m,
        borderWidth: 1, borderColor: '#333', paddingHorizontal: 15, color: '#fff', marginBottom: 15
    },
    btn: {
        width: '100%', height: 50, backgroundColor: COLORS.primary, borderRadius: RADIUS.m,
        justifyContent: 'center', alignItems: 'center', marginBottom: 20
    },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    
    divider: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 20 },
    line: { flex: 1, height: 1, backgroundColor: '#333' },
    or: { color: '#aaa', marginHorizontal: 15, fontSize: 12, fontWeight: 'bold' },
    
    createAccount: { color: '#fff', fontWeight: 'bold' },
    
    footer: { 
        borderTopWidth: 1, borderTopColor: '#333', padding: 20, alignItems: 'center', 
        backgroundColor: '#0a0a0a' 
    },
    footerText: { color: '#fff', fontWeight: 'bold' }
});
