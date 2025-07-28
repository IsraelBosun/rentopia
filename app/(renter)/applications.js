// app/(renter)/applications.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext'; // To get current renter's userId
import { listenToCollection, firestorePaths, getDocument } from '../../services/firestoreService';
import colors from '../../constants/Colors';
import { FontAwesome } from '@expo/vector-icons';

/**
 * ApplicationCard Component (Inline for simplicity, can be moved to components/application/ApplicationCard.js)
 * Displays a single rental application in a card format.
 */
const ApplicationCard = ({ application, onPress }) => {
  const [propertyTitle, setPropertyTitle] = useState('Loading Property...');
  const [propertyImage, setPropertyImage] = useState("https://placehold.co/600x400/000000/yellow");

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (application.propertyId) {
        try {
          const property = await getDocument(
            firestorePaths.getPublicListingsCollection().path,
            application.propertyId
          );
          if (property) {
            setPropertyTitle(property.title);
            if (property.imageUrls && property.imageUrls.length > 0) {
              setPropertyImage(property.imageUrls[0]);
            }
          } else {
            setPropertyTitle('Property Not Found');
          }
        } catch (error) {
          console.error("Error fetching property for application card:", error);
          setPropertyTitle('Error Loading Property');
        }
      }
    };
    fetchPropertyDetails();
  }, [application.propertyId]);

  // Determine status color
  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'approved':
        return styles.statusApproved;
      case 'rejected':
        return styles.statusRejected;
      default:
        return styles.statusDefault;
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(application.id)}>
      <Image
        source={{ uri: propertyImage }}
        style={styles.cardImage}
        onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{propertyTitle}</Text>
        <Text style={styles.cardDate}>Applied On: {application.createdAt?.toDate().toLocaleDateString() || 'N/A'}</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={[styles.statusText, getStatusStyle(application.status)]}>
            {application.status?.toUpperCase() || 'UNKNOWN'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * RenterApplicationsScreen Component
 * Displays a list of rental applications made by the current renter.
 */
export default function RenterApplicationsScreen() {
  const { userId } = useAuth(); // Get the current renter's userId
  const [applications, setApplications] = useState([]);
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

    const applicationsCollectionPath = firestorePaths.getRenterApplicationsCollection(userId).path;
    const conditions = [];
    // In a real app, you might filter by status here, e.g., conditions.push({ field: 'status', operator: '==', value: 'pending' });

    const unsubscribe = listenToCollection(
      applicationsCollectionPath,
      conditions,
      (data) => {
        setApplications(data);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching applications:", err);
        setError("Failed to load applications. Please try again.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe(); // Clean up the listener
  }, [userId]);

  /**
   * Navigates to the application details screen.
   * @param {string} id - The ID of the application to view.
   */
  const navigateToApplicationDetails = (id) => {
    // We'll create this screen next if needed: app/(renter)/applications/[id].js
    Alert.alert("Feature Coming Soon", `View details for application ID: ${id}`);
    // router.push(`/renter/applications/${id}`);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { /* Implement refresh logic if needed */ }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (applications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="file-text-o" size={60} color={colors.light.textSecondary} style={{ marginBottom: 20 }} />
        <Text style={styles.emptyText}>You haven't submitted any applications yet.</Text>
        <Text style={styles.emptySubtitle}>Start exploring properties to find your next home!</Text>
        <TouchableOpacity style={styles.exploreButton} onPress={() => router.push('/(renter)')}>
          <Text style={styles.exploreButtonText}>Explore Properties</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={applications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ApplicationCard application={item} onPress={navigateToApplicationDetails} />
        )}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
      />
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
    marginBottom: 20,
  },
  exploreButton: {
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
  exploreButtonText: {
    color: colors.light.card,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  listContentContainer: {
    paddingVertical: 10,
  },
  // ApplicationCard Styles
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
    flexDirection: 'row', // Arrange image and content horizontally
  },
  cardImage: {
    width: 100, // Fixed width for the image thumbnail
    height: '100%', // Take full height of the card
    resizeMode: 'cover',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  cardContent: {
    flex: 1, // Take remaining space
    padding: 15,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.primaryDark,
    fontFamily: 'Inter-Bold',
    marginBottom: 5,
  },
  cardDate: {
    fontSize: 14,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
    marginRight: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  statusPending: {
    backgroundColor: colors.light.warning,
    color: colors.light.card,
  },
  statusApproved: {
    backgroundColor: colors.light.success,
    color: colors.light.card,
  },
  statusRejected: {
    backgroundColor: colors.light.error,
    color: colors.light.card,
  },
  statusDefault: {
    backgroundColor: colors.light.border,
    color: colors.light.textSecondary,
  },
});
