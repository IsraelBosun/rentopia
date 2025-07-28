// app/(auth)/login.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router'; // Import router for navigation
import { useAuth } from '../../context/AuthContext'; // Correct path to AuthContext
import colors from '../../constants/Colors'; // Correct path to colors

/**
 * LoginScreen Component
 * Allows users to log in with their email and password.
 */
export default function LoginScreen() {
  const { login, isLoadingAuth } = useAuth(); // Get login function and loading state from AuthContext
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Handles the login button press.
   * Calls the login function from AuthContext and handles success/error.
   */
  const handleLogin = async () => {
    setErrorMessage(''); // Clear previous errors
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      await login(email, password);
      // AuthContext's useEffect in app/_layout.js will handle redirection on success
    } catch (error) {
      // Firebase errors often have a 'code' property
      let friendlyMessage = 'Login failed. Please check your credentials.';
      if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-disabled') {
        friendlyMessage = 'Your account has been disabled.';
      } else if (error.code === 'auth/invalid-credential') { // Covers wrong password/email
        friendlyMessage = 'Incorrect email or password.';
      }
      setErrorMessage(friendlyMessage);
      console.error("Login error:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to RentFree</Text>
          <Text style={styles.subtitle}>Login to find your perfect home or manage listings</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.light.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoadingAuth} // Disable input during loading
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.light.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoadingAuth} // Disable input during loading
          />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoadingAuth} // Disable button during loading
          >
            {isLoadingAuth ? (
              <ActivityIndicator color={colors.light.card} />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerLinkContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity disabled={isLoadingAuth}>
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background, // Use light mode background for auth screens
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.light.primaryDark,
    marginBottom: 10,
    fontFamily: 'Inter-Bold', // Use the loaded font
  },
  subtitle: {
    fontSize: 16,
    color: colors.light.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter-Regular', // Use the loaded font
  },
  form: {
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: colors.light.card,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: colors.light.textPrimary,
    borderWidth: 1,
    borderColor: colors.light.border,
    fontFamily: 'Inter-Regular',
  },
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: colors.light.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.light.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonText: {
    color: colors.light.card,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  registerLinkContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  registerText: {
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
  },
  registerLink: {
    color: colors.light.primary,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  errorText: {
    color: colors.light.error,
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
});
