// app/(agent)/payments.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { listenToCollection, firestorePaths } from '../../services/firestoreService'; // Import firestorePaths
import colors from '../../constants/Colors';
import { useFocusEffect } from 'expo-router'; // To refetch when screen is focused

/**
 * AgentPaymentsScreen Component
 * Displays a list of payment transactions or payouts for the current agent.
 */
export default function AgentPaymentsScreen() {
  const { userId } = useAuth(); // Get the current agent's userId
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // useFocusEffect to refetch payments whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setError("User not authenticated. Cannot fetch payments.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      // Use the new helper function to get the payments collection path
      const paymentsCollection = firestorePaths.getPublicPaymentsCollection();
      if (!paymentsCollection) {
        setError("Firestore not initialized for payments collection.");
        setIsLoading(false);
        return;
      }
      const paymentsCollectionPath = paymentsCollection.path;

      // --- FIX IS HERE: REORDERED ARGUMENTS ---
      const unsubscribe = listenToCollection(
        paymentsCollectionPath,
        [{ field: 'agentId', operator: '==', value: userId }], // This is now correctly the 'conditions' argument
        (data) => { // This is now correctly the 'callback' argument
          // Sort by transaction date, newest first
          const sortedData = data.sort((a, b) => {
            const dateA = a.transactionDate?.toDate ? a.transactionDate.toDate() : new Date(0); // Handle potentially missing/invalid timestamps
            const dateB = b.transactionDate?.toDate ? b.transactionDate.toDate() : new Date(0);
            return dateB - dateA;
          });
          setPayments(sortedData);
          setIsLoading(false);
        },
        (err) => { // This is now correctly the 'onError' argument
          console.error("Error listening to agent payments:", err);
          setError("Failed to load payments. Please try again.");
          setIsLoading(false);
        }
      );
      // --- END FIX ---

      // Cleanup listener on component unmount or when dependencies change
      return () => unsubscribe();
    }, [userId]) // Re-run effect if userId changes
  );

  /**
   * Renders a single payment item in the FlatList.
   * @param {object} item - The payment data.
   */
  const renderPaymentItem = ({ item }) => (
    <TouchableOpacity
      style={styles.paymentCard}
      // onPress={() => router.push(`/agent/payments/${item.id}`)} // Future: Navigate to payment details
    >
      <View style={styles.cardHeader}>
        <Text style={styles.paymentAmount}>₦{item.amount?.toLocaleString('en-NG')}</Text>
        <Text style={[styles.paymentStatus, item.status === 'completed' ? styles.statusCompleted : styles.statusPending]}>
          {item.status?.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.paymentType}>{item.type === 'rent' ? 'Rent Payment' : 'Payout'}</Text>
      <Text style={styles.paymentDate}>
        Date: {item.transactionDate ? new Date(item.transactionDate.toDate()).toLocaleDateString() : 'N/A'}
      </Text>
      {item.listingTitle && (
        <Text style={styles.paymentListing}>Listing: {item.listingTitle}</Text>
      )}
      {item.payoutAmount && (
        <Text style={styles.paymentPayout}>Payout: ₦{item.payoutAmount?.toLocaleString('en-NG')}</Text>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        {/* No retry button here, as it's a listener. User can navigate away and back. */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No payment history found.</Text>
            <Text style={styles.emptyText}>Payments will appear here as transactions occur.</Text>
          </View>
        )}
      />
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
  listContentContainer: {
    padding: 15,
    paddingBottom: 20, // Give some space at the bottom
  },
  paymentCard: {
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
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.primaryDark,
    fontFamily: 'Inter-Bold',
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    fontFamily: 'Inter-Regular',
    paddingVertical: 4,
    borderRadius: 5,
  },
  statusCompleted: {
    backgroundColor: colors.light.success,
    color: colors.light.card,
  },
  statusPending: {
    backgroundColor: colors.light.warning,
    color: colors.light.card,
  },
  paymentType: {
    fontSize: 14,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
    marginBottom: 5,
  },
  paymentDate: {
    fontSize: 14,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    marginBottom: 5,
  },
  paymentListing: {
    fontSize: 14,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    marginTop: 5,
  },
  paymentPayout: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.light.primary,
    fontFamily: 'Inter-Bold',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 18,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
  },
});
