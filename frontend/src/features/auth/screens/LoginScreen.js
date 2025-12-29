
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import client from '../../../core/api/client';
import { setIdToken, setCurrentUserId } from '../../../core/auth';
import { COLORS } from '../../../core/design/Theme';

const { width } = Dimensions.get('window');
const isWeb = width > 850;

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUniLogin, setIsUniLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Fade Animation
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const isValidEmail = (email) => {
      // If University Login, enforce strictly
      if (isUniLogin) {
          return email.endsWith('.edu') || email.endsWith('.ac.in');
      }
      // If Standard Login, allow anything (Username or Email) structure wise
      // We can do a loose check: if it HAS an @, it should look like an email
      if (email.includes('@')) {
         const re = /\S+@\S+\.\S+/;
         return re.test(email);
      }
      // Otherwise, assume it's a username (valid)
      return true;
  };

  const handleAuth = async () => {
    console.log("Auth Attempt:", { email, isUniLogin, isRegistering });
    
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter your email/username and password.");
      return;
    }
    
    if (!isValidEmail(email)) {
        Alert.alert("Invalid Input", isUniLogin ? "Please enter a valid university email (.edu or .ac.in)" : "Please enter a valid email or username");
        return;
    }

    if (isRegistering && !name) {
        Alert.alert("Missing Name", "Please enter your full name.");
        return;
    }

    setLoading(true);
    try {
      let response;
      if (isRegistering) {
        response = await client.post('/auth/register', {
          email,
          password,
          name
        });
      } else {
        response = await client.post('/auth/login', {
          email,
          password
        });
      }

      if (response && response.data) {
        const { token, uid } = response.data;
        if (token && uid) {
          await setIdToken(token);
          await setCurrentUserId(uid);
          navigation.replace('Main');
        } else {
          throw new Error("Invalid response from server");
        }
      }
    } catch (error) {
      const message = error.response?.data?.error || error.message || "Authentication failed";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Hero Image */}
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=3870&auto=format&fit=crop' }} 
        style={styles.backgroundImage} 
        resizeMode="cover"
      />
      
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
        style={styles.gradientOverlay}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.contentWrapper}
      >
        <Animated.View style={[styles.loginCard, { opacity: fadeAnim }]}>
            {/* Logo Section */}
            <View style={styles.logoContainer}>
                <View style={styles.logoIcon}>
                    <Ionicons name="school" size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.logoText}>CampusHub</Text>
                <Text style={styles.subText}>{isRegistering ? "Join the network" : "Welcome back"}</Text>
            </View>
            
            {/* Toggle University Mode */}
            {!isRegistering && (
                <View style={styles.authTypeToggle}>
                    <TouchableOpacity 
                        style={[styles.typeBtn, !isUniLogin && styles.typeBtnActive]} 
                        onPress={() => setIsUniLogin(false)}
                    >
                        <Text style={[styles.typeBtnText, !isUniLogin && styles.typeBtnTextActive]}>Standard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.typeBtn, isUniLogin && styles.typeBtnActive]} 
                        onPress={() => setIsUniLogin(true)}
                    >
                        <Text style={[styles.typeBtnText, isUniLogin && styles.typeBtnTextActive]}>University ID</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Forms */}
            <View style={styles.formGroup}>
                {isRegistering && (
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>
                )}
                
                <View style={styles.inputContainer}>
                    <Ionicons name={isUniLogin ? "school-outline" : "mail-outline"} size={20} color="#888" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder={isUniLogin ? "University Email (.edu)" : "Email or Username"}
                        placeholderTextColor="#666"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType={isUniLogin ? "email-address" : "default"}
                    />
                </View>
                
                <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#666"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
                    </TouchableOpacity>
                </View>

                {!isRegistering && (
                    <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity 
                    style={[styles.loginBtn, loading && {opacity: 0.7}]}
                    onPress={handleAuth}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.loginBtnText}>
                            {isRegistering ? "Sign Up" : (isUniLogin ? "Log In with University ID" : "Log In")}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.line} />
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {isRegistering ? "Already have an account?" : "Don't have an account?"}
                </Text>
                <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
                    <Text style={styles.footerLink}>{isRegistering ? " Log In" : " Sign Up"}</Text>
                </TouchableOpacity>
            </View>

        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(20, 20, 20, 0.85)', // Glass-like dark background
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(20px)', // Web Only
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      }
    })
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoIcon: {
      width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(59, 130, 246, 0.15)',
      justifyContent: 'center', alignItems: 'center', marginBottom: 15,
      borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)'
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subText: {
      color: '#888',
      fontSize: 14,
      marginTop: 5
  },
  
  authTypeToggle: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 12,
      padding: 4,
      marginBottom: 20,
  },
  typeBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
  },
  typeBtnActive: {
      backgroundColor: '#333',
  },
  typeBtnText: {
      color: '#888',
      fontSize: 13,
      fontWeight: '600',
  },
  typeBtnTextActive: {
      color: '#fff',
  },

  formGroup: {
      width: '100%',
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1A1A1A',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#333',
      marginBottom: 15,
      paddingHorizontal: 15,
      height: 50,
  },
  inputIcon: {
      marginRight: 10,
  },
  input: {
      flex: 1,
      color: '#fff',
      fontSize: 15,
      height: '100%',
  },
  
  forgotBtn: {
      alignSelf: 'flex-end',
      marginBottom: 20,
  },
  forgotText: {
      color: COLORS.primary,
      fontSize: 13,
      fontWeight: '600',
  },
  
  loginBtn: {
      backgroundColor: COLORS.primary,
      height: 50,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: COLORS.primary,
      shadowOpacity: 0.4,
      shadowRadius: 10,
      zIndex: 10, // Ensure clickable
  },
  loginBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
  },
  
  divider: {
      flexDirection: 'row', alignItems: 'center', marginVertical: 25,
  },
  line: {
      flex: 1, height: 1, backgroundColor: '#333',
  },
  orText: {
      color: '#666', marginHorizontal: 15, fontSize: 12, fontWeight: 'bold'
  },
  
  footer: {
      flexDirection: 'row', justifyContent: 'center',
      zIndex: 10, // Ensure clickable
  },
  footerText: {
      color: '#888',
  },
  footerLink: {
      color: COLORS.primary,
      fontWeight: 'bold',
  }
});
