// app/(agent)/profile.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import colors from '../../constants/Colors';
import { FontAwesome } from '@expo/vector-icons'; // For checkmark icon

/**
 * AgentProfileScreen Component
 * Displays the current agent's profile information and verification status.
 */
export default function AgentProfileScreen() {
  const { logout, isLoadingAuth } = useAuth();
  const { userProfile, isLoadingProfile, error: profileError } = useUser();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed from profile:", error);
      // Alert.alert("Logout Error", "Failed to log out. Please try again.");
    }
  };

  if (isLoadingAuth || isLoadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (profileError || !userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading profile: {profileError ? profileError.message : 'Profile data not found.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { /* Implement retry logic or navigate back */ }}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Determine verification status (default to Verified for MVP)
  // These will be dynamic based on actual verification process later
  const isLasreraVerified = userProfile.lasreraNumber ? true : false; // If number exists, assume verified for MVP
  const isCacVerified = userProfile.cacNumber ? true : false;       // If number exists, assume verified for MVP

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.profileHeader}>
        <FontAwesome name="user-circle" size={80} color={colors.light.primaryDark} style={styles.profileIcon} />
        <Text style={styles.profileName}>{userProfile.firstName} {userProfile.lastName}</Text>
        <Text style={styles.profileRole}>{userProfile.role?.toUpperCase()}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Contact Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{userProfile.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone Number:</Text>
          <Text style={styles.infoValue}>{userProfile.phoneNumber || 'N/A'}</Text>
        </View>
      </View>

      {userProfile.role === 'agent' && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Agent Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Type:</Text>
            <Text style={styles.infoValue}>{userProfile.agentAccountType ? userProfile.agentAccountType.charAt(0).toUpperCase() + userProfile.agentAccountType.slice(1) : 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>LASRERA License:</Text>
            <Text style={styles.infoValue}>{userProfile.lasreraNumber || 'N/A'}</Text>
            {userProfile.lasreraNumber && (
              <View style={styles.verificationStatus}>
                <FontAwesome name="check-circle" size={18} color={isLasreraVerified ? colors.light.success : colors.light.warning} />
                <Text style={styles.verificationText}>{isLasreraVerified ? 'Verified' : 'Pending'}</Text>
              </View>
            )}
          </View>
          {userProfile.agentAccountType === 'company' && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CAC Registration:</Text>
              <Text style={styles.infoValue}>{userProfile.cacNumber || 'N/A'}</Text>
              {userProfile.cacNumber && (
                <View style={styles.verificationStatus}>
                  <FontAwesome name="check-circle" size={18} color={isCacVerified ? colors.light.success : colors.light.warning} />
                  <Text style={styles.verificationText}>{isCacVerified ? 'Verified' : 'Pending'}</Text>
                </View>
              )}
            </View>
          )}
          {/* Placeholder for Bank Details - will be added later */}
          <Text style={styles.cardSubtitle}>Bank Account Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bank Name:</Text>
            <Text style={styles.infoValue}>*** (Coming Soon)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Name:</Text>
            <Text style={styles.infoValue}>*** (Coming Soon)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Number:</Text>
            <Text style={styles.infoValue}>*** (Coming Soon)</Text>
          </View>
        </View>
      )}

      {/* Future: Edit Profile Button (commented out as it's uneditable for now) */}
      {/*
      <TouchableOpacity style={styles.editProfileButton}>
        <Text style={styles.editProfileButtonText}>Edit Profile</Text>
      </TouchableOpacity>
      */}

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={isLoadingAuth}
      >
        {isLoadingAuth ? (
          <ActivityIndicator color={colors.light.card} />
        ) : (
          <Text style={styles.logoutButtonText}>Logout</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.light.background,
  },
  errorText: {
    fontSize: 18,
    color: colors.light.error,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Inter-Regular',
  },
  retryButton: {
    backgroundColor: colors.light.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.light.card,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  profileIcon: {
    marginBottom: 15,
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.light.primaryDark,
    fontFamily: 'Inter-Bold',
    marginBottom: 5,
  },
  profileRole: {
    fontSize: 16,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    backgroundColor: colors.light.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  infoCard: {
    width: '100%',
    backgroundColor: colors.light.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.light.border,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.primary,
    fontFamily: 'Inter-Bold',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Bold',
    marginTop: 15,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.border,
  },
  infoLabel: {
    fontSize: 15,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
    flex: 2,
    textAlign: 'right',
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: colors.light.success, // Default to success color
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  verificationText: {
    fontSize: 12,
    color: colors.light.card,
    fontFamily: 'Inter-Bold',
    marginLeft: 5,
  },
  logoutButton: {
    width: '80%',
    maxWidth: 250,
    height: 50,
    backgroundColor: colors.light.error,
    borderRadius: 10,
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: 30,
    shadowColor: colors.light.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  logoutButtonText: {
    color: colors.light.card,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  editProfileButton: {
    width: '100%',
    backgroundColor: colors.light.secondary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.light.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  editProfileButtonText: {
    color: colors.light.card,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
});
