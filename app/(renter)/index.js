// app/(renter)/index.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, TextInput, ScrollView as RNScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Import Picker
import { router } from 'expo-router';
import { listenToCollection, firestorePaths } from '../../services/firestoreService';
import colors from '../../constants/Colors';
import { FontAwesome } from '@expo/vector-icons'; // For icons like bed, bath, kitchen

/**
 * Helper function to generate options for numbers (e.g., beds, restrooms, kitchens)
 * Starts from 0.
 */
const generateNumberOptions = (max) => {
  const options = [{ label: 'Any', value: '' }]; // Default "Any" option
  for (let i = 0; i <= max; i++) {
    options.push({ label: String(i), value: String(i) });
  }
  return options;
};

// Options for dropdowns
const bedOptions = generateNumberOptions(10);
const kitchenOptions = generateNumberOptions(5);
const restroomOptions = generateNumberOptions(10);

/**
 * PropertyCard Component (Inline for simplicity, can be moved to components/property/PropertyCard.js)
 * Displays a single property listing in a card format.
 */
const PropertyCard = ({ property, onPress }) => {
  const defaultImage = "https://placehold.co/400x300/E0E0E0/888888?text=No+Image"; // Placeholder image

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(property.id)}>
      <Image
        source={{ uri: property.imageUrls && property.imageUrls.length > 0 ? property.imageUrls[0] : defaultImage }}
        style={styles.cardImage}
        onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{property.title}</Text>
        <Text style={styles.cardAddress}>{property.address}</Text>
        <Text style={styles.cardRent}>₦{property.rentAmount?.toLocaleString('en-NG') || 'N/A'}/year</Text>
        <View style={styles.propertyDetailsRow}>
          <View style={styles.detailItem}>
            <FontAwesome name="bed" size={16} color={colors.light.textSecondary} />
            <Text style={styles.detailText}>{property.numBeds || 0} Beds</Text>
          </View>
          <View style={styles.detailItem}>
            <FontAwesome name="cutlery" size={16} color={colors.light.textSecondary} />
            <Text style={styles.detailText}>{property.numKitchens || 0} Kitchens</Text>
          </View>
          <View style={styles.detailItem}>
            <FontAwesome name="bath" size={16} color={colors.light.textSecondary} />
            <Text style={styles.detailText}>{property.numRestrooms || 0} Restrooms</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};


/**
 * RenterHomeScreen Component
 * Displays a list of available property listings for renters to explore, with search and filter options.
 */
export default function RenterHomeScreen() {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBeds, setFilterBeds] = useState('');
  const [filterKitchens, setFilterKitchens] = useState('');
  const [filterRestrooms, setFilterRestrooms] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const listingsCollectionPath = firestorePaths.getPublicListingsCollection().path;
    const conditions = [];

    // Add filters based on state
    if (filterBeds !== '') {
      conditions.push({ field: 'numBeds', operator: '>=', value: parseInt(filterBeds) });
    }
    if (filterKitchens !== '') {
      conditions.push({ field: 'numKitchens', operator: '>=', value: parseInt(filterKitchens) });
    }
    if (filterRestrooms !== '') {
      conditions.push({ field: 'numRestrooms', operator: '>=', value: parseInt(filterRestrooms) });
    }

    // Listen to real-time updates for listings with filters
    const unsubscribe = listenToCollection(
      listingsCollectionPath,
      conditions,
      (data) => {
        // Client-side filtering for search query (Firestore doesn't support full-text search directly)
        const filteredBySearch = data.filter(listing =>
          listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.address.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setListings(filteredBySearch);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching listings:", err);
        setError("Failed to load properties. Please try again.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe(); // Clean up the listener on component unmount
  }, [searchQuery, filterBeds, filterKitchens, filterRestrooms]); // Re-run effect when filters change

  /**
   * Navigates to the property details screen.
   * @param {string} id - The ID of the property to view.
   */
  const navigateToPropertyDetails = (id) => {
    router.push(`/(renter)/property/${id}`);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { /* Implement a refresh/retry logic */ }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search by title or address..."
        placeholderTextColor={colors.light.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing" // iOS clear button
      />

      {/* Filters Section */}
      <RNScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Beds:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={filterBeds}
              onValueChange={(itemValue) => setFilterBeds(itemValue)}
              style={styles.picker}
            >
              {bedOptions.map((option, index) => (
                <Picker.Item key={index} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Kitchens:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={filterKitchens}
              onValueChange={(itemValue) => setFilterKitchens(itemValue)}
              style={styles.picker}
            >
              {kitchenOptions.map((option, index) => (
                <Picker.Item key={index} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Restrooms:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={filterRestrooms}
              onValueChange={(itemValue) => setFilterRestrooms(itemValue)}
              style={styles.picker}
            >
              {restroomOptions.map((option, index) => (
                <Picker.Item key={index} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>
        {/* Add more filter options here (e.g., rent range, property type) */}
      </RNScrollView>

      {listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="search" size={60} color={colors.light.textSecondary} style={{ marginBottom: 20 }} />
          <Text style={styles.emptyText}>No properties found matching your criteria.</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your search or filters.</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PropertyCard property={item} onPress={navigateToPropertyDetails} />
          )}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    paddingHorizontal: 10,
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
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Bold',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.light.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  listContentContainer: {
    paddingVertical: 10,
  },
  // Search Bar Styles
  searchBar: {
    width: '100%',
    height: 50,
    backgroundColor: colors.light.card,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: colors.light.textPrimary,
    borderWidth: 1,
    borderColor: colors.light.border,
    fontFamily: 'Inter-Regular',
    marginBottom: 15,
    marginTop: 10,
  },
  // Filters Section Styles
  filtersContainer: {
    marginBottom: 15,
    paddingVertical: 5,
  },
  filterItem: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 15,
    backgroundColor: colors.light.card,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  filterLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    marginBottom: 5,
  },
  pickerWrapper: {
    width: 100, // Fixed width for picker
    height: 40,
    backgroundColor: colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: 40,
    color: colors.light.textPrimary,
    paddingHorizontal: 5, // Adjust padding for picker content
  },
  // PropertyCard Styles (retained from previous version)
  card: {
    backgroundColor: colors.light.card,
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: colors.light.border,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    width: '100%',
    alignSelf: 'center',
  },
  cardImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardContent: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.primaryDark,
    fontFamily: 'Inter-Bold',
    marginBottom: 5,
  },
  cardAddress: {
    fontSize: 14,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    marginBottom: 10,
  },
  cardRent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.accent,
    fontFamily: 'Inter-Bold',
    marginBottom: 10,
  },
  propertyDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.border,
    paddingTop: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 5,
    fontSize: 14,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
  },
});
