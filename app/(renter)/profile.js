// app/(renter)/profile.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext'; // To get current renter's userId and logout function
import { listenToDocument, firestorePaths } from '../../services/firestoreService';
import colors from '../../constants/Colors';
import { FontAwesome } from '@expo/vector-icons'; // For profile icons

/**
 * RenterProfileScreen Component
 * Displays the profile details of the currently logged-in renter.
 * Details are read-only for now. Includes a Sign Out button.
 */
export default function RenterProfileScreen() {
  const { userId, user, logout } = useAuth(); // Get the current renter's userId, user object, and logout function
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setError("User not authenticated. Please log in.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const userProfilePath = firestorePaths.getUserProfileDoc(userId).path;
    const userProfileDocId = firestorePaths.getUserProfileDoc(userId).docId;

    // Listen to real-time updates for the user's profile document
    const unsubscribe = listenToDocument(
      userProfilePath,
      userProfileDocId,
      (data) => {
        if (data) {
          setProfile(data);
        } else {
          // Profile document might not exist yet, which is fine for new users
          // We can prompt them to complete their profile later if needed.
          setProfile(null);
          setError("Your profile data is not complete. Please update it.");
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching renter profile:", err);
        setError("Failed to load profile. Please try again.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe(); // Clean up the listener on component unmount
  }, [userId]);

  const handleSignOut = async () => {
    try {
      await logout();
      // AuthContext will handle redirection to login page
    } catch (err) {
      console.error("Sign out failed:", err);
      Alert.alert("Sign Out Error", "Failed to sign out. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error && !profile) { // Show error only if there's an error and no profile data
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        {/* Changed Refresh button to Sign Out button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <FontAwesome name="user-circle" size={80} color={colors.light.primary} style={styles.profileIcon} />
        <Text style={styles.userName}>{profile?.firstName || user?.email || 'Renter'} {profile?.lastName || ''}</Text>
        <Text style={styles.userEmail}>{user?.email || 'Email Not Available'}</Text>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.detailRow}>
          <FontAwesome name="user" size={20} color={colors.light.textSecondary} style={styles.detailIcon} />
          <Text style={styles.detailLabel}>Full Name:</Text>
          <Text style={styles.detailValue}>{profile?.firstName || 'N/A'} {profile?.lastName || 'N/A'}</Text>
        </View>
        <View style={styles.detailRow}>
          <FontAwesome name="phone" size={20} color={colors.light.textSecondary} style={styles.detailIcon} />
          <Text style={styles.detailLabel}>Phone Number:</Text>
          <Text style={styles.detailValue}>{profile?.phoneNumber || 'N/A'}</Text>
        </View>
        <View style={styles.detailRow}>
          <FontAwesome name="map-marker" size={20} color={colors.light.textSecondary} style={styles.detailIcon} />
          <Text style={styles.detailLabel}>Address:</Text>
          <Text style={styles.detailValue}>{profile?.address || 'N/A'}</Text>
        </View>
        <View style={styles.detailRow}>
          <FontAwesome name="calendar" size={20} color={colors.light.textSecondary} style={styles.detailIcon} />
          <Text style={styles.detailLabel}>Date of Birth:</Text>
          <Text style={styles.detailValue}>{profile?.dateOfBirth || 'N/A'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.detailRow}>
          <FontAwesome name="id-card-o" size={20} color={colors.light.textSecondary} style={styles.detailIcon} />
          <Text style={styles.detailLabel}>User ID:</Text>
          <Text style={styles.detailValue}>{userId || 'N/A'}</Text>
        </View>
        <View style={styles.detailRow}>
          <FontAwesome name="user-tag" size={20} color={colors.light.textSecondary} style={styles.detailIcon} />
          <Text style={styles.detailLabel}>Role:</Text>
          <Text style={styles.detailValue}>{profile?.role || 'Renter'}</Text>
        </View>
      </View>

      {/* Placeholder for Edit Profile Button */}
      <TouchableOpacity style={styles.editProfileButton}>
        <Text style={styles.editProfileButtonText}>Edit Profile (Coming Soon)</Text>
      </TouchableOpacity>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
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
  // Reusing signOutButton styles for the error state button
  retryButton: { // This style is now effectively replaced by signOutButton in the error state
    backgroundColor: colors.light.primary, // Keeping original style for reference, but it's not used directly now
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: { // Keeping original style for reference, but it's not used directly now
    color: colors.light.card,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  profileIcon: {
    marginBottom: 15,
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.light.primaryDark,
    fontFamily: 'Inter-Bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
  },
  detailsCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.light.card,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.light.border,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.primary,
    fontFamily: 'Inter-Bold',
    marginBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.border,
    paddingBottom: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 15,
    width: 24, // Fixed width for icon alignment
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: 16,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
    flex: 2,
    textAlign: 'right',
  },
  editProfileButton: {
    backgroundColor: colors.light.secondary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 20,
    shadowColor: colors.light.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  editProfileButtonText: {
    color: colors.light.card,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  signOutButton: {
    backgroundColor: colors.light.error, // Red for sign out
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 20, // Add some bottom margin for spacing
    shadowColor: colors.light.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  signOutButtonText: {
    color: colors.light.card,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
});
