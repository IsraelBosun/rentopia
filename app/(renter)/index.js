// app/(renter)/index.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    TextInput,
    KeyboardAvoidingView, // Added for better keyboard handling
    Platform, // Added for Platform specific styles
} from 'react-native';
import { router } from 'expo-router';
import { listenToCollection, firestorePaths } from '../../services/firestoreService';
import colors from '../../constants/Colors';
import { FontAwesome5 } from '@expo/vector-icons'; // Using FontAwesome5 for more modern icons

/**
 * PropertyCard Component
 * Displays a single property listing in a card format with an enhanced UI.
 */
const PropertyCard = ({ property, onPress }) => {
    const defaultImage = "https://placehold.co/600x400/D3EBF8/4A90E2?text=No+Image+Available"; // More inviting placeholder

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
                <Text style={styles.cardRent}>
                    ₦{property.rentAmount?.toLocaleString('en-NG') || 'N/A'}<Text style={styles.rentPeriod}>/year</Text>
                </Text>

                <View style={styles.propertyDetailsRow}>
                    <View style={styles.detailItem}>
                        <FontAwesome5 name="bed" size={16} color={colors.light.primary} />
                        <Text style={styles.detailText}>{property.numBeds || 0} Beds</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <FontAwesome5 name="kitchen-set" size={16} color={colors.light.primary} /> {/* More specific kitchen icon */}
                        <Text style={styles.detailText}>{property.numKitchens || 0} Kitchens</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <FontAwesome5 name="toilet" size={16} color={colors.light.primary} /> {/* More specific restroom icon */}
                        <Text style={styles.detailText}>{property.numRestrooms || 0} Baths</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};


/**
 * RenterHomeScreen Component
 * Displays a list of available property listings for renters to explore, with search options.
 */
export default function RenterHomeScreen() {
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        const listingsCollectionPath = firestorePaths.getPublicListingsCollection().path;

        const unsubscribe = listenToCollection(
            listingsCollectionPath,
            [], // No Firestore specific conditions for beds/kitchens/restrooms
            (data) => {
                let filteredData = data;

                // Client-side filtering for search query
                const filteredBySearch = filteredData.filter(listing =>
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
    }, [searchQuery]); // Re-run effect only when search query changes

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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // Adjust as needed
        >
            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
                <FontAwesome5 name="search" size={18} color={colors.light.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchBarInput}
                    placeholder="Search by location or keywords..."
                    placeholderTextColor={colors.light.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    clearButtonMode="while-editing" // iOS clear button
                />
            </View>

            {listings.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <FontAwesome5 name="home" size={60} color={colors.light.textSecondary} style={{ marginBottom: 20 }} />
                    <Text style={styles.emptyText}>No properties found</Text>
                    <Text style={styles.emptySubtitle}>Try adjusting your search.</Text>
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
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.light.background,
        paddingHorizontal: 15, // Increased padding for a more spacious feel
        paddingTop: 10,
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
        marginTop: 50, // Adjusted margin since filters are gone
    },
    emptyText: {
        fontSize: 22, // Larger
        fontWeight: 'bold',
        color: colors.light.textPrimary,
        fontFamily: 'Inter-Bold',
        marginBottom: 8, // Reduced spacing
    },
    emptySubtitle: {
        fontSize: 16,
        color: colors.light.textSecondary,
        textAlign: 'center',
        fontFamily: 'Inter-Regular',
    },
    listContentContainer: {
        paddingVertical: 10,
        paddingBottom: 20, // Add some bottom padding to ensure last card isn't cut off
    },
    // Search Bar Styles - Enhanced
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.light.card,
        borderRadius: 12, // More rounded corners
        paddingHorizontal: 15,
        height: 55, // Taller for better touch target
        borderWidth: 1,
        borderColor: colors.light.border,
        marginBottom: 15, // Keep some spacing below search bar
        shadowColor: colors.light.primaryDark, // Subtle shadow for depth
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchBarInput: {
        flex: 1,
        fontSize: 16,
        color: colors.light.textPrimary,
        fontFamily: 'Inter-Regular',
    },
    // PropertyCard Styles (kept as is, as they were already good)
    card: {
        backgroundColor: colors.light.card,
        borderRadius: 18, // More rounded corners for a softer look
        marginBottom: 20, // More space between cards
        overflow: 'hidden',
        shadowColor: colors.light.primaryDark,
        shadowOffset: { width: 0, height: 6 }, // Deeper shadow for more lift
        shadowOpacity: 0.15, // More prominent shadow
        shadowRadius: 10,
        elevation: 8, // Higher elevation for Android shadow
        width: '100%',
        alignSelf: 'center',
    },
    cardImage: {
        width: '100%',
        height: 220, // Slightly taller images
        resizeMode: 'cover',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
    },
    cardContent: {
        padding: 20, // Increased padding inside card content
    },
    cardTitle: {
        fontSize: 20, // Larger title
        fontWeight: 'bold',
        color: colors.light.primaryDark,
        fontFamily: 'Inter-Bold',
        marginBottom: 8, // More space below title
    },
    cardAddress: {
        fontSize: 15, // Slightly larger address text
        color: colors.light.textSecondary,
        fontFamily: 'Inter-Regular',
        marginBottom: 12, // More space below address
    },
    cardRent: {
        fontSize: 22, // Larger rent amount
        fontWeight: 'bold',
        color: colors.light.accent, // Accent color for rent
        fontFamily: 'Inter-Bold',
        marginBottom: 15, // More space below rent
    },
    rentPeriod: {
        fontSize: 14,
        color: colors.light.textSecondary,
        fontFamily: 'Inter-Regular',
    },
    propertyDetailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Distribute items evenly
        alignItems: 'center',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.light.border,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5, // Small horizontal padding for spacing
    },
    detailText: {
        marginLeft: 8, // More space between icon and text
        fontSize: 15, // Slightly larger detail text
        color: colors.light.textPrimary,
        fontFamily: 'Inter-Regular',
    },
});