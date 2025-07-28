// app/(auth)/register.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import colors from '../../constants/Colors';

/**
 * RegisterScreen Component
 * Allows users to register a new account and choose their role (Renter/Agent)
 * and for Agents, specify if they are an Individual or Company, and collect name and phone.
 */
export default function RegisterScreen() {
  const { register, isLoadingAuth } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(''); // New field
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(null); // 'renter' or 'agent'
  const [agentAccountType, setAgentAccountType] = useState(null); // 'individual' or 'company'
  const [lasreraNumber, setLasreraNumber] = useState('');
  const [cacNumber, setCacNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Handles the registration button press.
   * Performs validation and calls the register function from AuthContext.
   */
  const handleRegister = async () => {
    setErrorMessage(''); // Clear previous errors

    // Basic validation for all fields
    if (!firstName || !lastName || !email || !phoneNumber || !password || !confirmPassword || !selectedRole) {
      setErrorMessage('Please fill in all required fields and select a role.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    // Basic phone number validation (can be more robust later)
    if (!/^\d{10,15}$/.test(phoneNumber)) { // Simple regex for 10-15 digits
      setErrorMessage('Please enter a valid phone number (10-15 digits).');
      return;
    }

    // Agent-specific validation
    if (selectedRole === 'agent') {
      if (!agentAccountType) {
        setErrorMessage('Please specify if you are an Individual or a Company.');
        return;
      }
      if (!lasreraNumber) {
        setErrorMessage('LASRERA License Number is required for agents.');
        return;
      }
      if (agentAccountType === 'company' && !cacNumber) {
        setErrorMessage('CAC Registration Number is required for company agents.');
        return;
      }
    }

    // Construct agentDetails object carefully to avoid 'undefined'
    const agentDetails = {};
    if (selectedRole === 'agent') {
      // Ensure values are null if not provided, instead of undefined
      agentDetails.agentAccountType = agentAccountType || null;
      agentDetails.lasreraNumber = lasreraNumber || null;

      if (agentAccountType === 'company') {
        agentDetails.cacNumber = cacNumber || null;
      }
    }

    try {
      // Pass all relevant data to the register function
      await register(
        email,
        password,
        selectedRole,
        firstName,
        lastName,
        phoneNumber,
        agentDetails // Pass the carefully constructed agentDetails object
      );

      Alert.alert("Success", "Account created successfully! Redirecting...");
      // router.replace('/'); // Optionally navigate to home or dashboard after successful registration
    } catch (error) {
      let friendlyMessage = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email address is already in use.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'The email address is not valid.';
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = 'The password is too weak.';
      }
      setErrorMessage(friendlyMessage);
      console.error("Registration error:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Join RentFree</Text>
          <Text style={styles.subtitle}>Create your account to get started</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor={colors.light.textSecondary}
            autoCapitalize="words"
            value={firstName}
            onChangeText={setFirstName}
            editable={!isLoadingAuth}
          />
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            placeholderTextColor={colors.light.textSecondary}
            autoCapitalize="words"
            value={lastName}
            onChangeText={setLastName}
            editable={!isLoadingAuth}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.light.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoadingAuth}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={colors.light.textSecondary}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            editable={!isLoadingAuth}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.light.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoadingAuth}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={colors.light.textSecondary}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!isLoadingAuth}
          />

          {/* Role Selection (Renter/Agent) */}
          <View style={styles.roleSelectionContainer}>
            <Text style={styles.sectionLabel}>I am a:</Text>
            <View style={styles.toggleButtons}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  selectedRole === 'renter' && styles.selectedToggleButton,
                  isLoadingAuth && styles.disabledButton,
                ]}
                onPress={() => { setSelectedRole('renter'); setAgentAccountType(null); setLasreraNumber(''); setCacNumber(''); }} // Clear agent-specific fields
                disabled={isLoadingAuth}
              >
                <Text style={[styles.toggleButtonText, selectedRole === 'renter' && styles.selectedToggleButtonText]}>Renter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  selectedRole === 'agent' && styles.selectedToggleButton,
                  isLoadingAuth && styles.disabledButton,
                ]}
                onPress={() => setSelectedRole('agent')}
                disabled={isLoadingAuth}
              >
                <Text style={[styles.toggleButtonText, selectedRole === 'agent' && styles.selectedToggleButtonText]}>Agent</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Agent-specific fields */}
          {selectedRole === 'agent' && (
            <View style={styles.agentFieldsContainer}>
              {/* Individual/Company Selection */}
              <View style={styles.roleSelectionContainer}>
                <Text style={styles.sectionLabel}>Agent Type:</Text>
                <View style={styles.toggleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      agentAccountType === 'individual' && styles.selectedToggleButton,
                      isLoadingAuth && styles.disabledButton,
                    ]}
                    onPress={() => { setAgentAccountType('individual'); setCacNumber(''); }} // Clear CAC if individual
                    disabled={isLoadingAuth}
                  >
                    <Text style={[styles.toggleButtonText, agentAccountType === 'individual' && styles.selectedToggleButtonText]}>Individual</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      agentAccountType === 'company' && styles.selectedToggleButton,
                      isLoadingAuth && styles.disabledButton,
                    ]}
                    onPress={() => setAgentAccountType('company')}
                    disabled={isLoadingAuth}
                  >
                    <Text style={[styles.toggleButtonText, agentAccountType === 'company' && styles.selectedToggleButtonText]}>Company</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={styles.input}
                placeholder="LASRERA License Number"
                placeholderTextColor={colors.light.textSecondary}
                value={lasreraNumber}
                onChangeText={setLasreraNumber}
                editable={!isLoadingAuth}
              />

              {agentAccountType === 'company' && (
                <TextInput
                  style={styles.input}
                  placeholder="CAC Registration Number"
                  placeholderTextColor={colors.light.textSecondary}
                  value={cacNumber}
                  onChangeText={setCacNumber}
                  editable={!isLoadingAuth}
                />
              )}
            </View>
          )}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={isLoadingAuth}
          >
            {isLoadingAuth ? (
              <ActivityIndicator color={colors.light.card} />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity disabled={isLoadingAuth}>
                <Text style={styles.loginLink}>Login</Text>
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
    backgroundColor: colors.light.background,
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
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: colors.light.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
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
  roleSelectionContainer: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    color: colors.light.textPrimary,
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
  },
  toggleButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    backgroundColor: colors.light.border,
    borderRadius: 10,
    padding: 5,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  selectedToggleButton: {
    backgroundColor: colors.light.primary,
  },
  toggleButtonText: {
    color: colors.light.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  selectedToggleButtonText: {
    color: colors.light.card,
  },
  disabledButton: {
    opacity: 0.6,
  },
  agentFieldsContainer: {
    width: '100%',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    alignItems: 'center',
  },
  registerButton: {
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
  loginLinkContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  loginText: {
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
  },
  loginLink: {
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