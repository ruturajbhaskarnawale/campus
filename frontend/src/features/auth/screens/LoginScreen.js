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
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { initFirebase, signIn, signUp, getIdToken } from '../../../core/firebase/firebase';
import client from '../../../core/api/client';
import { setIdToken, setCurrentUserId } from '../../../core/auth';
import { COLORS } from '../../../core/design/Theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isWeb, setIsWeb] = useState(width > 850);

  useEffect(() => {
    const updateLayout = () => {
      setIsWeb(Dimensions.get('window').width > 850);
    };
    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => subscription?.remove();
  }, []);

  const handleAuth = async () => {
    console.log("Handle Auth Triggered", email, password);
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      initFirebase();
      let user;
      if (isRegistering) {
        if (!email.endsWith('.edu')) {
           throw new Error('Registration restricted to university emails (.edu)');
        }
        user = await signUp(email, password);
      } else {
        user = await signIn(email, password);
      }

      const token = await getIdToken(user, true);
      await setIdToken(token);
      await setCurrentUserId(user.uid);
      
      // Verify backend
      if (isRegistering) {
        await client.post('/auth/verify-token', { idToken: token });
      } else {
        try {
           await client.post('/auth/verify-token', { idToken: token });
        } catch(e) { console.log("Verify warning", e); }
      }

      navigation.replace('Main');
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
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined} 
        style={styles.contentWrapper}
      >
        {/* Left Side - Hero Image (Web Only) */}
        {isWeb && (
          <View style={styles.heroContainer}>
            {/* Placeholder for the generated hero image */}
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1000&auto=format&fit=crop' }} 
              style={styles.heroImage}
              resizeMode="contain"
            />
            <View style={styles.floatingUI}>
               <Image 
                 source={{ uri: 'https://cdn-icons-png.flaticon.com/512/919/919853.png' }} // Node.js icon example
                 style={{ width: 40, height: 40, marginBottom: 10 }}
               />
               <Text style={{ color: '#fff', fontWeight: 'bold' }}>CampusHub</Text>
               <Text style={{ color: '#888', fontSize: 12 }}>Connect. Code. Create.</Text>
            </View>
          </View>
        )}

        {/* Right Side - Login Form */}
        <View style={styles.formSection}>
          <View style={styles.loginBox}>
            <Text style={styles.logoText}>CampusHub</Text>
            
            <View style={styles.inputGroup}>
              <TextInput 
                style={styles.input}
                placeholder="Phone number, username, or email"
                placeholderTextColor="#737373"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
              <TextInput 
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#737373"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.disabledBtn]} 
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>{isRegistering ? "Sign Up" : "Log In"}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity style={styles.socialLogin}>
              <Ionicons name="school" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.socialText}>Log in with University ID</Text>
            </TouchableOpacity>

            {!isRegistering && (
              <TouchableOpacity>
                <Text style={styles.forgotPassword}>Forgot password?</Text>
              </TouchableOpacity>
            )}
            
            {isRegistering && (
              <Text style={styles.termsText}>
                By signing up, you agree to our Terms, Data Policy and Cookies Policy.
              </Text>
            )}
          </View>

          <View style={styles.signupBox}>
            <Text style={styles.signupText}>
              {isRegistering ? "Have an account?" : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
              <Text style={styles.signupLink}>{isRegistering ? "Log in" : "Sign up"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.appStoreSection}>
             <Text style={styles.getAppText}>Get the app.</Text>
             <View style={styles.storeButtons}>
                <View style={styles.storeBtnPlaceholder}><Text style={styles.storeText}>Google Play</Text></View>
                <View style={styles.storeBtnPlaceholder}><Text style={styles.storeText}>Microsoft</Text></View>
             </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Deep Dark Background
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 935, // Instagram Web Max Width
    height: '100%',
    maxHeight: 700,
  },
  heroContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 32,
    display: width > 850 ? 'flex' : 'none', // Redundant specific style but useful
    position: 'relative',
  },
  heroImage: {
    width: 400,
    height: 600,
  },
  floatingUI: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    backgroundColor: 'rgba(20,20,20,0.9)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 0px 20px rgba(0, 175, 156, 0.3)',
      },
      default: {
        shadowColor: '#00af9c',
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
      },
    }),
  },
  formSection: {
    width: 350,
    justifyContent: 'center',
    flexShrink: 0,
    paddingHorizontal: 20, // For mobile
  },
  loginBox: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#363636',
    borderRadius: 8, // Instagram logic: Web=1px border, Mobile=No border usually but we kept consistency
    padding: 40,
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', // Simple font
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32,
    letterSpacing: -1,
    fontStyle: 'italic', // Pseudo-logo style
  },
  inputGroup: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 38,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#363636',
    borderRadius: 3,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#fff',
  },
  loginButton: {
    width: '100%',
    height: 32,
    backgroundColor: '#0095f6', // Instagram Blue
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#363636',
  },
  orText: {
    color: '#8e8e8e',
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  socialLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  socialText: {
    color: '#fff', // White for dark mode or #385185 for light
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPassword: {
    color: '#e0f1ff', // Light Blue
    fontSize: 12,
  },
  termsText: {
    color: '#8e8e8e',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  signupBox: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#363636',
    borderRadius: 8, // Instagram logic
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  signupText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 4,
  },
  signupLink: {
    color: '#0095f6',
    fontSize: 14,
    fontWeight: '600',
  },
  appStoreSection: {
    alignItems: 'center',
    padding: 10,
  },
  getAppText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  storeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  storeBtnPlaceholder: {
    width: 130,
    height: 40,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#363636',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeText: {
    color: '#fff',
    fontWeight: '600',
  }
});
