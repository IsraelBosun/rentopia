// app/(agent)/listings/[id].js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router'; // useLocalSearchParams to get the ID
import { listenToDocument, updateDocument, firestorePaths } from '../../../services/firestoreService';
import colors from '../../../constants/Colors';

/**
 * ListingDetailsEditScreen Component
 * Displays and allows editing of a specific property listing by an agent.
 */
export default function ListingDetailsEditScreen() {
  const { id } = useLocalSearchParams(); // Get the listing ID from the URL
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // State to toggle edit mode

  // Form states for editing
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editRentAmount, setEditRentAmount] = useState('');
  const [editAgencyFeePercentage, setEditAgencyFeePercentage] = useState('');
  const [editLegalFeePercentage, setEditLegalFeePercentage] = useState('');
  const [editPlatformFeePercentage, setEditPlatformFeePercentage] = useState('');
  const [saveError, setSaveError] = useState(''); // Error message for save operations

  // Effect to fetch listing data when the component mounts or ID changes
  useEffect(() => {
    if (!id) {
      setError("No listing ID provided.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const listingDocPath = firestorePaths.getPublicListingDoc(id).path;

    const unsubscribe = listenToDocument(
      firestorePaths.getPublicListingsCollection().path, // Collection path
      id, // Document ID
      (data) => {
        if (data) {
          setListing(data);
          // Initialize edit states with current listing data
          setEditTitle(data.title);
          setEditDescription(data.description);
          setEditAddress(data.address);
          setEditRentAmount(data.rentAmount?.toString());
          setEditAgencyFeePercentage(data.agencyFeePercentage?.toString());
          setEditLegalFeePercentage(data.legalFeePercentage?.toString());
          setEditPlatformFeePercentage(data.platformFeePercentage?.toString());
        } else {
          setError("Listing not found.");
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching listing details:", err);
        setError("Failed to load listing details. Please try again.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe(); // Cleanup listener
  }, [id]);

  // Function to calculate fees (for display purposes, same as create screen)
  const calculateFees = useCallback((rent, agency, legal, platform) => {
    const parsedRent = parseFloat(rent);
    if (isNaN(parsedRent) || parsedRent <= 0) return { agencyFee: 0, legalFee: 0, platformFee: 0, totalPayable: 0 };

    const parsedAgency = parseFloat(agency) / 100;
    const parsedLegal = parseFloat(legal) / 100;
    const parsedPlatform = parseFloat(platform) / 100;

    const agencyFee = parsedRent * (isNaN(parsedAgency) ? 0 : parsedAgency);
    const legalFee = parsedRent * (isNaN(parsedLegal) ? 0 : parsedLegal);
    const platformFee = parsedRent * (isNaN(parsedPlatform) ? 0 : parsedPlatform);
    const totalPayable = parsedRent + agencyFee + legalFee + platformFee;

    return { agencyFee, legalFee, platformFee, totalPayable };
  }, []);

  const { agencyFee, legalFee, platformFee, totalPayable } = calculateFees(
    isEditing ? editRentAmount : listing?.rentAmount,
    isEditing ? editAgencyFeePercentage : listing?.agencyFeePercentage,
    isEditing ? editLegalFeePercentage : listing?.legalFeePercentage,
    isEditing ? editPlatformFeePercentage : listing?.platformFeePercentage
  );

  /**
   * Handles saving the edited listing details.
   */
  const handleSaveListing = async () => {
    setSaveError('');
    setIsLoading(true); // Use global loading for save operation

    // Basic validation for edited fields
    if (!editTitle || !editDescription || !editAddress || !editRentAmount || !editAgencyFeePercentage || !editLegalFeePercentage || !editPlatformFeePercentage) {
      setSaveError('All fields are required.');
      setIsLoading(false);
      return;
    }
    if (isNaN(parseFloat(editRentAmount)) || parseFloat(editRentAmount) <= 0) {
      setSaveError('Rent amount must be a positive number.');
      setIsLoading(false);
      return;
    }

    try {
      const updatedData = {
        title: editTitle,
        description: editDescription,
        address: editAddress,
        rentAmount: parseFloat(editRentAmount),
        agencyFeePercentage: parseFloat(editAgencyFeePercentage),
        legalFeePercentage: parseFloat(editLegalFeePercentage),
        platformFeePercentage: parseFloat(editPlatformFeePercentage),
        totalPayable: totalPayable, // Recalculate and save
        updatedAt: new Date(), // Add an updated timestamp
      };

      const listingsCollectionPath = firestorePaths.getPublicListingsCollection().path;
      await updateDocument(listingsCollectionPath, id, updatedData);

      Alert.alert('Success', 'Listing updated successfully!', [
        { text: 'OK', onPress: () => setIsEditing(false) } // Exit edit mode on success
      ]);
    } catch (error) {
      console.error("Error updating listing:", error);
      setSaveError('Failed to update listing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading listing details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Listing data is not available.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{isEditing ? 'Edit Listing' : 'Listing Details'}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
            disabled={isLoading}
          >
            <Text style={styles.editButtonText}>{isEditing ? 'Cancel Edit' : 'Edit Listing'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Title:</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              editable={!isLoading}
            />
          ) : (
            <Text style={styles.detailValue}>{listing.title}</Text>
          )}

          <Text style={styles.detailLabel}>Description:</Text>
          {isEditing ? (
            <TextInput
              style={[styles.editInput, styles.textArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              numberOfLines={4}
              editable={!isLoading}
            />
          ) : (
            <Text style={styles.detailValue}>{listing.description}</Text>
          )}

          <Text style={styles.detailLabel}>Address:</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editAddress}
              onChangeText={setEditAddress}
              editable={!isLoading}
            />
          ) : (
            <Text style={styles.detailValue}>{listing.address}</Text>
          )}

          <Text style={styles.detailLabel}>Rent Amount (₦):</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              keyboardType="numeric"
              value={editRentAmount}
              onChangeText={setEditRentAmount}
              editable={!isLoading}
            />
          ) : (
            <Text style={styles.detailValue}>₦{listing.rentAmount?.toLocaleString('en-NG')}</Text>
          )}

          {/* Fee Breakdown Display/Edit */}
          <Text style={styles.feeSectionTitle}>Fee Structure:</Text>
          <View style={styles.feeDisplayRow}>
            <Text style={styles.detailLabel}>Agency Fee (%):</Text>
            {isEditing ? (
              <TextInput
                style={styles.feeEditInput}
                keyboardType="numeric"
                value={editAgencyFeePercentage}
                onChangeText={setEditAgencyFeePercentage}
                editable={!isLoading}
              />
            ) : (
              <Text style={styles.detailValue}>{listing.agencyFeePercentage}%</Text>
            )}
          </View>
          <View style={styles.feeDisplayRow}>
            <Text style={styles.detailLabel}>Legal Fee (%):</Text>
            {isEditing ? (
              <TextInput
                style={styles.feeEditInput}
                keyboardType="numeric"
                value={editLegalFeePercentage}
                onChangeText={setEditLegalFeePercentage}
                editable={!isLoading}
              />
            ) : (
              <Text style={styles.detailValue}>{listing.legalFeePercentage}%</Text>
            )}
          </View>
          <View style={styles.feeDisplayRow}>
            <Text style={styles.detailLabel}>Platform Fee (%):</Text>
            {isEditing ? (
              <TextInput
                style={styles.feeEditInput}
                keyboardType="numeric"
                value={editPlatformFeePercentage}
                onChangeText={setEditPlatformFeePercentage}
                editable={!isLoading}
              />
            ) : (
              <Text style={styles.detailValue}>{listing.platformFeePercentage}%</Text>
            )}
          </View>

          {/* Calculated Fees Display (always visible) */}
          <View style={styles.calculatedFeesContainer}>
            <Text style={styles.calculatedFeeText}>Calculated Agency Fee: ₦{agencyFee.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            <Text style={styles.calculatedFeeText}>Calculated Legal Fee: ₦{legalFee.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            <Text style={styles.calculatedFeeText}>Calculated Platform Fee: ₦{platformFee.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            <Text style={styles.totalPayableText}>Total Payable by Renter: ₦{totalPayable.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>

          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

          {isEditing && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveListing}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.light.card} />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
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
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.primaryDark,
    fontFamily: 'Inter-Bold',
  },
  editButton: {
    backgroundColor: colors.light.secondary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  editButtonText: {
    color: colors.light.card,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  detailCard: {
    width: '100%',
    maxWidth: 600, // Max width for larger screens
    backgroundColor: colors.light.card,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.light.border,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  detailLabel: {
    fontSize: 15,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    marginTop: 10,
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 17,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  editInput: {
    width: '100%',
    height: 45,
    backgroundColor: colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    color: colors.light.textPrimary,
    borderWidth: 1,
    borderColor: colors.light.primaryLight,
    fontFamily: 'Inter-Regular',
    marginBottom: 10,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  feeSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Bold',
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: 5,
  },
  feeDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  feeEditInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    color: colors.light.textPrimary,
    borderWidth: 1,
    borderColor: colors.light.primaryLight,
    textAlign: 'right',
    marginLeft: 10,
    fontFamily: 'Inter-Regular',
  },
  calculatedFeesContainer: {
    width: '100%',
    backgroundColor: colors.light.secondary,
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: colors.light.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calculatedFeeText: {
    fontSize: 15,
    color: colors.light.card,
    fontFamily: 'Inter-Regular',
    marginBottom: 5,
  },
  totalPayableText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.card,
    fontFamily: 'Inter-Bold',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.light.primaryLight,
    paddingTop: 10,
  },
  saveButton: {
    width: '100%',
    height: 50,
    backgroundColor: colors.light.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
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
});
