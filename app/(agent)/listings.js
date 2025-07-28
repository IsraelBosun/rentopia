// app/(agent)/listings.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router'; // useFocusEffect for refetching when screen is focused
import { useAuth } from '../../context/AuthContext';
import { listenToCollection, deleteDocument, firestorePaths } from '../../services/firestoreService'; // Import listenToCollection and deleteDocument
import colors from '../../constants/Colors';

/**
 * AgentListingsScreen Component
 * Displays a list of properties created by the current agent.
 * Allows navigation to view/edit details and delete listings.
 */
export default function AgentListingsScreen() {
  const { userId } = useAuth(); // Get the current agent's userId
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // useFocusEffect to refetch listings whenever the screen comes into focus
  // This ensures that after creating a new listing or deleting one, the list updates.
  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setError("User not authenticated. Cannot fetch listings.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const listingsCollectionPath = firestorePaths.getPublicListingsCollection().path;

      // --- FIX IS HERE: REORDERED ARGUMENTS ---
      const unsubscribe = listenToCollection(
        listingsCollectionPath,
        [['agentId', '==', userId]], // This is now correctly the 'conditions' argument
        (data) => { // This is now correctly the 'callback' argument
          // Sort by creation date, newest first
          const sortedData = data.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0); // Handle potentially missing/invalid timestamps
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
          });
          setListings(sortedData);
          setIsLoading(false);
        },
        (err) => { // This is now correctly the 'onError' argument
          console.error("Error listening to agent listings:", err);
          setError("Failed to load listings. Please try again.");
          setIsLoading(false);
        }
      );
      // --- END FIX ---

      // Cleanup listener on component unmount or when dependencies change
      return () => unsubscribe();
    }, [userId]) // Re-run effect if userId changes
  );

  /**
   * Handles deleting a listing.
   * @param {string} listingId - The ID of the listing to delete.
   */
  const handleDeleteListing = (listingId) => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to delete this listing? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const listingsCollectionPath = firestorePaths.getPublicListingsCollection().path;
              await deleteDocument(listingsCollectionPath, listingId);
              Alert.alert("Success", "Listing deleted successfully.");
              // The onSnapshot listener will automatically update the list.
            } catch (err) {
              console.error("Error deleting listing:", err);
              Alert.alert("Error", "Failed to delete listing. Please try again.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  /**
   * Renders a single listing item in the FlatList.
   * @param {object} item - The listing data.
   */
  const renderListingItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listingCard}
      onPress={() => router.push(`/agent/listings/${item.id}`)} // Navigate to dynamic listing details
    >
      <View style={styles.cardHeader}>
        <Text style={styles.listingTitle}>{item.title}</Text>
        <Text style={styles.listingStatus}>{item.status?.toUpperCase() || 'N/A'}</Text>
      </View>
      <Text style={styles.listingAddress}>{item.address}</Text>
      <Text style={styles.listingRent}>₦{item.rentAmount?.toLocaleString('en-NG')} / month</Text>
      <Text style={styles.listingFees}>Total Payable: ₦{item.totalPayable?.toLocaleString('en-NG')}</Text>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/agent/listings/${item.id}`)}
        >
          <Text style={styles.actionButtonText}>View/Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteListing(item.id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading your listings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/(agent)')}>
          <Text style={styles.retryButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={listings}
        renderItem={renderListingItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't created any listings yet.</Text>
            <TouchableOpacity
              style={styles.createListingButton}
              onPress={() => router.push('/(agent)/listings/create')}
            >
              <Text style={styles.createListingButtonText}>Create New Listing</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {/* Floating Action Button to Add New Listing */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(agent)/listings/create')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
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
  listContentContainer: {
    padding: 15,
    paddingBottom: 80, // Add padding for FAB
  },
  listingCard: {
    backgroundColor: colors.light.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: colors.light.border,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.primaryDark,
    fontFamily: 'Inter-Bold',
    flexShrink: 1, // Allow text to wrap
  },
  listingStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.light.primary,
    backgroundColor: colors.light.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    marginLeft: 10,
    fontFamily: 'Inter-Regular',
  },
  listingAddress: {
    fontSize: 14,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    marginBottom: 5,
  },
  listingRent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Bold',
    marginTop: 5,
  },
  listingFees: {
    fontSize: 14,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: 10,
  },
  actionButton: {
    backgroundColor: colors.light.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 10,
  },
  actionButtonText: {
    color: colors.light.card,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  deleteButton: {
    backgroundColor: colors.light.error,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200, // Ensure it's visible even with few items
  },
  emptyText: {
    fontSize: 18,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Inter-Regular',
  },
  createListingButton: {
    backgroundColor: colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    shadowColor: colors.light.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  createListingButtonText: {
    color: colors.light.card,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 30,
    bottom: 30,
    backgroundColor: colors.light.primary,
    borderRadius: 30,
    shadowColor: colors.light.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 10,
  },
  fabText: {
    fontSize: 30,
    color: colors.light.card,
    lineHeight: 30, // Adjust line height to center '+'
  },
});
