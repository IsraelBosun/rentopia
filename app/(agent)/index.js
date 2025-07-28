// app/(agent)/index.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Access authentication state and logout
import { useUser } from '../../context/UserContext'; // Access user profile data
import colors from '../../constants/Colors'; // Import color palette
import { router } from 'expo-router'; // For navigation

/**
 * AgentDashboardScreen Component
 * This is the main dashboard for agents, showing an overview and quick actions.
 */
export default function AgentDashboardScreen() {
  const { logout, isLoadingAuth } = useAuth(); // Get logout function and auth loading state
  const { userProfile, isLoadingProfile } = useUser(); // Get user profile and profile loading state

  // Determine the display name for the agent
  const agentName = userProfile?.email || 'Agent'; // Default to email if name not set, or 'Agent'

  /**
   * Handles the logout process.
   */
  const handleLogout = async () => {
    try {
      await logout();
      // AuthContext's useEffect in app/_layout.js will handle redirection to login
    } catch (error) {
      console.error("Logout failed:", error);
      // Optionally show an alert to the user
      // Alert.alert("Logout Error", "Failed to log out. Please try again.");
    }
  };

  if (isLoadingAuth || isLoadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading Agent Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {agentName}!</Text>
        <Text style={styles.subHeaderText}>Your RentFree Dashboard</Text>
      </View>

      {/* Quick Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Active Listings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>₦2.5M</Text>
            <Text style={styles.statLabel}>Pending Payments</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>New Inquiries</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(agent)/listings/create')} // Navigate to create listing screen
          >
            <Text style={styles.actionButtonText}>+ New Listing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(agent)/listings')} // Navigate to listings management
          >
            <Text style={styles.actionButtonText}>Manage Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(agent)/payments')} // Navigate to payments history
          >
            <Text style={styles.actionButtonText}>View Payments</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity/Listings (Placeholder) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>No recent activity to display.</Text>
          <Text style={styles.infoText}>Create your first listing!</Text>
        </View>
      </View>

      {/* Logout Button */}
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
  contentContainer: {
    padding: 20,
    paddingBottom: 40, // Add some padding at the bottom for scrollability
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
  header: {
    marginBottom: 30,
    alignItems: 'center',
    paddingTop: 20, // Space from the top of the screen/header bar
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.light.primaryDark,
    fontFamily: 'Inter-Bold',
    marginBottom: 5,
  },
  subHeaderText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
  },
  section: {
    marginBottom: 30,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Bold',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  statCard: {
    backgroundColor: colors.light.card,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%', // Roughly half width for two columns
    marginBottom: 15,
    shadowColor: colors.light.border,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 100, // Ensure cards have a minimum height
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.light.primary,
    fontFamily: 'Inter-Bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: colors.light.primaryLight,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%', // Roughly half width for two columns
    marginBottom: 15,
    shadowColor: colors.light.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.card,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.light.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.light.border,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 16,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 5,
  },
  logoutButton: {
    width: '80%',
    maxWidth: 250,
    height: 50,
    backgroundColor: colors.light.error,
    borderRadius: 10,
    justifyContent: 'center',
    alignSelf: 'center', // Center the button horizontally
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
});
