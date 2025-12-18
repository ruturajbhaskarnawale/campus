import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS } from '../design/Theme';
import { Ionicons } from '@expo/vector-icons';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
          return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={styles.title}>Oops! Something went wrong.</Text>
          <Text style={styles.message}>
            We encountered an unexpected error. Please try again or restart the app.
          </Text>
          
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
             <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background.primary,
  },
  title: {
    ...FONTS.h2,
    marginTop: 16,
    marginBottom: 8,
    color: COLORS.text.primary,
  },
  message: {
    ...FONTS.body,
    textAlign: 'center',
    color: COLORS.text.secondary,
    marginBottom: 32,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  }
});
