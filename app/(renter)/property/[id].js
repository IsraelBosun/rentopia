// app/(renter)/property/[id].js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { listenToDocument, firestorePaths, getDocument } from '../../../services/firestoreService'; // Import getDocument to fetch agent profile
import colors from '../../../constants/Colors';
import { FontAwesome } from '@expo/vector-icons';

const { width } = Dimensions.get('window'); // Get screen width for image carousel

// Fixed platform fee for display
const platformFeePercentage = 2;
const platformFixedLegalFee = 3; // Fixed 3% if platform handles legal

/**
 * PropertyDetailsScreen Component for Renters
 * Displays comprehensive details of a single property listing.
 */
export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams(); // Get the listing ID from the URL
  const [listing, setListing] = useState(null);
  const [agentProfile, setAgentProfile] = useState(null); // State to store agent's profile
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to calculate fees (for display purposes)
  const calculateFees = useCallback(() => {
    if (!listing) return { agencyFee: 0, legalFee: 0, platformFee: 0, totalServiceCharges: 0, totalPayable: 0 };

    const rent = listing.rentAmount;
    const agencyPercentage = listing.agencyFeePercentage;
    const legalPercentage = listing.legalFeePercentage; // This will be the stored value (either agent's or fixed platform)

    const agencyFee = rent * (agencyPercentage / 100);
    const legalFee = rent * (legalPercentage / 100);
    const platformFee = rent * (platformFeePercentage / 100);

    // Calculate total service charges
    const totalServiceCharges = (listing.serviceCharges || []).reduce((sum, charge) => {
      const chargeValue = parseFloat(charge.value);
      return sum + (isNaN(chargeValue) ? 0 : chargeValue);
    }, 0);

    const totalPayable = rent + agencyFee + legalFee + platformFee + totalServiceCharges;

    return { agencyFee, legalFee, platformFee, totalServiceCharges, totalPayable };
  }, [listing]);

  const { agencyFee, legalFee, platformFee, totalServiceCharges, totalPayable } = calculateFees();

  // Effect to fetch listing data and agent profile
  useEffect(() => {
    if (!id) {
      setError("No listing ID provided.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const listingsCollectionPath = firestorePaths.getPublicListingsCollection().path;

    const unsubscribe = listenToDocument(
      listingsCollectionPath,
      id,
      async (data) => {
        if (data) {
          setListing(data);
          // Fetch agent's profile using the agentId from the listing
          if (data.agentId) {
            try {
              const agentProfilePath = firestorePaths.getUserProfileDoc(data.agentId).path;
              const agentProfileDocId = firestorePaths.getUserProfileDoc(data.agentId).docId;
              const profile = await getDocument(agentProfilePath, agentProfileDocId);
              setAgentProfile(profile);
            } catch (agentError) {
              console.error("Error fetching agent profile:", agentError);
              setAgentProfile(null); // Set to null if profile can't be fetched
            }
          }
        } else {
          setError("Listing not found.");
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching listing details:", err);
        setError("Failed to load property details. Please try again.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe(); // Cleanup listener
  }, [id]);

  const handleContactAgent = () => {
    if (agentProfile?.phoneNumber) {
      Alert.alert(
        "Contact Agent",
        `You can contact ${agentProfile.firstName || ''} ${agentProfile.lastName || ''} at ${agentProfile.phoneNumber}.`,
        [{ text: "OK" }]
      );
      // In a real app, you might open a dialer or chat app here
      // Linking.openURL(`tel:${agentProfile.phoneNumber}`);
    } else {
      Alert.alert("Contact Agent", "Agent contact number not available.");
    }
  };

  /**
   * Handles navigation to the application form.
   */
  const handleApplyNow = () => {
    if (listing?.id) {
      router.push(`/(renter)/applications/apply/${listing.id}`);
    } else {
      Alert.alert("Error", "Could not find property ID to apply.");
    }
  };


  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading property details...</Text>
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
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Property data is not available.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const defaultImage = "https://placehold.co/800x600/E0E0E0/888888?text=No+Image";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Image Carousel */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.imageCarousel}
      >
        {listing.imageUrls && listing.imageUrls.length > 0 ? (
          listing.imageUrls.map((url, index) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={styles.carouselImage}
              onError={(e) => console.log(`Image ${index} loading error:`, e.nativeEvent.error)}
            />
          ))
        ) : (
          <Image source={{ uri: defaultImage }} style={styles.carouselImage} />
        )}
      </ScrollView>

      <View style={styles.detailsContainer}>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.address}>{listing.address}</Text>
        <Text style={styles.rentAmount}>₦{listing.rentAmount?.toLocaleString('en-NG')}/year</Text>

        {/* Property Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Breakdown</Text>
          <View style={styles.detailRow}>
            <FontAwesome name="bed" size={20} color={colors.light.textSecondary} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Beds:</Text>
            <Text style={styles.detailValue}>{listing.numBeds || 0}</Text>
          </View>
          <View style={styles.detailRow}>
            <FontAwesome name="cutlery" size={20} color={colors.light.textSecondary} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Kitchens:</Text>
            <Text style={styles.detailValue}>{listing.numKitchens || 0}</Text>
          </View>
          <View style={styles.detailRow}>
            <FontAwesome name="bath" size={20} color={colors.light.textSecondary} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Restrooms:</Text>
            <Text style={styles.detailValue}>{listing.numRestrooms || 0}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{listing.description}</Text>
        </View>

        {/* Fee Structure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fee Structure</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Rent Amount:</Text>
            <Text style={styles.feeValue}>₦{listing.rentAmount?.toLocaleString('en-NG')}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Agent Fee:</Text>
            <Text style={styles.feeValue}>{listing.agencyFeePercentage}% (₦{agencyFee.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Legal Fee:</Text>
            <Text style={styles.feeValue}>
              {listing.legalHandlingOption === 'platform' ? `${platformFixedLegalFee}% (Platform Managed)` : `${listing.legalFeePercentage}% (Agent Managed)`}
              {' '} (₦{legalFee.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
            </Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Platform Fee:</Text>
            <Text style={styles.feeValue}>{platformFeePercentage}% (₦{platformFee.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</Text>
          </View>

          {/* Additional Service Charges */}
          {listing.serviceCharges && listing.serviceCharges.length > 0 && (
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>Additional Service Charges:</Text>
              {listing.serviceCharges.map((charge, index) => (
                <View key={index} style={styles.feeRow}>
                  <Text style={styles.feeLabel}>{charge.key}:</Text>
                  <Text style={styles.feeValue}>₦{charge.value?.toLocaleString('en-NG')}</Text>
                </View>
              ))}
              <View style={styles.feeRowTotal}>
                <Text style={styles.feeLabelTotal}>Total Service Charges:</Text>
                <Text style={styles.feeValueTotal}>₦{totalServiceCharges.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
              </View>
            </View>
          )}

          <View style={styles.totalPayableRow}>
            <Text style={styles.totalPayableLabel}>Total Payable by Renter:</Text>
            <Text style={styles.totalPayableValue}>₦{totalPayable.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>
        </View>

        {/* Lawyer Details (Conditional) */}
        {listing.legalHandlingOption === 'agent' && listing.lawyerName && listing.nbaId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lawyer Details (Agent Managed Legal)</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lawyer's Name:</Text>
              <Text style={styles.detailValue}>{listing.lawyerName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lawyer's NBA ID:</Text>
              <Text style={styles.detailValue}>{listing.nbaId}</Text>
            </View>
          </View>
        )}

        {/* Agent Contact Information */}
        {agentProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Agent</Text>
            <View style={styles.detailRow}>
              <FontAwesome name="user-circle" size={20} color={colors.light.textSecondary} style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Agent Name:</Text>
              <Text style={styles.detailValue}>{agentProfile.firstName} {agentProfile.lastName}</Text>
            </View>
            <View style={styles.detailRow}>
              <FontAwesome name="envelope" size={20} color={colors.light.textSecondary} style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{agentProfile.email}</Text>
            </View>
            <View style={styles.detailRow}>
              <FontAwesome name="phone" size={20} color={colors.light.textSecondary} style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>{agentProfile.phoneNumber || 'N/A'}</Text>
            </View>
            <TouchableOpacity style={styles.contactButton} onPress={handleContactAgent}>
              <Text style={styles.contactButtonText}>Contact Agent Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Apply Button - Now functional */}
        <TouchableOpacity style={styles.applyButton} onPress={handleApplyNow}>
          <Text style={styles.applyButtonText}>Apply for this Property</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.background,
    padding: 20,
  },
  imageCarousel: {
    width: width, // Full width of the screen
    height: 250, // Fixed height for carousel
    backgroundColor: colors.light.border,
  },
  carouselImage: {
    width: width, // Each image takes full width
    height: '100%',
    resizeMode: 'cover',
  },
  detailsContainer: {
    padding: 20,
    backgroundColor: colors.light.card,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -10, // Overlap slightly with image carousel
    shadowColor: colors.light.border,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.light.primaryDark,
    fontFamily: 'Inter-Bold',
    marginBottom: 5,
  },
  address: {
    fontSize: 16,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    marginBottom: 10,
  },
  rentAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.light.accent,
    fontFamily: 'Inter-Bold',
    marginBottom: 20,
  },
  section: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.primary,
    fontFamily: 'Inter-Bold',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 10,
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
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingVertical: 3,
  },
  feeLabel: {
    fontSize: 15,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
  },
  feeValue: {
    fontSize: 15,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Bold',
    textAlign: 'right',
  },
  subSection: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.border,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  feeRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.primaryLight,
  },
  feeLabelTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Bold',
  },
  feeValueTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.accent,
    fontFamily: 'Inter-Bold',
  },
  totalPayableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: colors.light.primary,
  },
  totalPayableLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.primaryDark,
    fontFamily: 'Inter-Bold',
  },
  totalPayableValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.accent,
    fontFamily: 'Inter-Bold',
  },
  contactButton: {
    backgroundColor: colors.light.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.light.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  contactButtonText: {
    color: colors.light.card,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  applyButton: {
    backgroundColor: colors.light.accent, // Changed color for prominence
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: colors.light.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  applyButtonText: {
    color: colors.light.card,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
});
