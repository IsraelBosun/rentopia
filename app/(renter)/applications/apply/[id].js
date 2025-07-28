// app/(renter)/applications/apply/[id].js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../../../context/AuthContext';
import { getDocument, addDocument, firestorePaths } from '../../../../services/firestoreService';
import colors from '../../../../constants/Colors';
import { Picker } from '@react-native-picker/picker';

/**
 * Helper function to generate options for numbers (e.g., occupants)
 * Starts from 1.
 */
const generateNumberOptions = (max, includeZero = false) => {
  const options = [{ label: 'Select', value: '' }];
  const start = includeZero ? 0 : 1;
  for (let i = start; i <= max; i++) {
    options.push({ label: String(i), value: String(i) });
  }
  return options;
};

const numberOfOccupantsOptions = generateNumberOptions(10); // Max 10 occupants
const employmentStatusOptions = [
  { label: 'Select', value: '' },
  { label: 'Employed', value: 'employed' },
  { label: 'Self-Employed', value: 'self-employed' },
  { label: 'Student', value: 'student' },
  { label: 'Unemployed', value: 'unemployed' },
  { label: 'Retired', value: 'retired' },
];

/**
 * RenterApplicationFormScreen Component
 * Allows renters to submit an application for a specific property.
 */
export default function RenterApplicationFormScreen() {
  const { id: listingId } = useLocalSearchParams(); // Get the listing ID
  const { userId, user } = useAuth(); // Get current renter's userId and user object

  const [listing, setListing] = useState(null);
  const [renterProfile, setRenterProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Application form states
  const [desiredMoveInDate, setDesiredMoveInDate] = useState('');
  const [numberOfOccupants, setNumberOfOccupants] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [currentEmployer, setCurrentEmployer] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [reasonForMoving, setReasonForMoving] = useState('');
  const [contactPreference, setContactPreference] = useState('email'); // Default to email

  // Fetch listing details and renter's profile on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!listingId || !userId) {
        setError("Missing property ID or user ID.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch listing details
        const fetchedListing = await getDocument(
          firestorePaths.getPublicListingsCollection().path,
          listingId
        );
        if (!fetchedListing) {
          setError("Property not found.");
          setIsLoading(false);
          return;
        }
        setListing(fetchedListing);

        // Fetch renter's profile
        const renterProfilePath = firestorePaths.getUserProfileDoc(userId).path;
        const renterProfileDocId = firestorePaths.getUserProfileDoc(userId).docId;
        const fetchedRenterProfile = await getDocument(renterProfilePath, renterProfileDocId);
        if (fetchedRenterProfile) {
          setRenterProfile(fetchedRenterProfile);
          // Pre-fill some fields if available in profile
          // setDesiredMoveInDate(fetchedRenterProfile.desiredMoveInDate || ''); // Example
        } else {
          Alert.alert("Profile Missing", "Please complete your profile details for a smoother application process.");
        }
      } catch (err) {
        console.error("Error fetching data for application form:", err);
        setError("Failed to load application form data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [listingId, userId]);

  /**
   * Handles the submission of the application form.
   */
  const handleSubmitApplication = async () => {
    setError('');
    setIsSubmitting(true);

    // Basic validation
    if (!desiredMoveInDate || !numberOfOccupants || !employmentStatus || !reasonForMoving) {
      setError('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }
    if (employmentStatus !== 'unemployed' && (!currentEmployer || !monthlyIncome || isNaN(parseFloat(monthlyIncome)) || parseFloat(monthlyIncome) <= 0)) {
      setError('Employer and valid monthly income are required for employed/self-employed status.');
      setIsSubmitting(false);
      return;
    }
    if (!userId || !listingId || !listing?.agentId) {
      setError('Application data incomplete. Please try again.');
      setIsSubmitting(false);
      return;
    }

    try {
      const applicationData = {
        propertyId: listingId,
        agentId: listing.agentId,
        renterId: userId,
        renterEmail: user?.email,
        propertyTitle: listing.title, // Store for easy display in applications list
        propertyAddress: listing.address,
        desiredMoveInDate,
        numberOfOccupants: parseInt(numberOfOccupants),
        employmentStatus,
        currentEmployer: employmentStatus !== 'unemployed' ? currentEmployer : null,
        monthlyIncome: employmentStatus !== 'unemployed' ? parseFloat(monthlyIncome) : null,
        reasonForMoving,
        contactPreference,
        status: 'pending', // Initial status
        submittedAt: new Date(),
        // Potentially add more fields like:
        // pets: 'yes' / 'no',
        // criminalRecord: 'yes' / 'no',
        // references: [{ name, contact, type }]
      };

      const applicationsCollectionPath = firestorePaths.getRenterApplicationsCollection(userId).path;
      await addDocument(applicationsCollectionPath, applicationData);

      Alert.alert('Application Submitted', 'Your application has been submitted successfully!', [
        { text: 'OK', onPress: () => router.replace('/(renter)/applications') } // Go to applications list
      ]);
    } catch (submitError) {
      console.error("Error submitting application:", submitError);
      setError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading application form...</Text>
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
        <Text style={styles.emptyText}>Property details not available for application.</Text>
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
          <Text style={styles.title}>Apply for {listing.title}</Text>
          <Text style={styles.subtitle}>{listing.address}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Desired Move-in Date (e.g., YYYY-MM-DD)"
            placeholderTextColor={colors.light.textSecondary}
            value={desiredMoveInDate}
            onChangeText={setDesiredMoveInDate}
            editable={!isSubmitting}
          />
          <View style={styles.pickerRow}>
            <Text style={styles.pickerLabel}>Number of Occupants:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={numberOfOccupants}
                onValueChange={(itemValue) => setNumberOfOccupants(itemValue)}
                style={styles.picker}
                enabled={!isSubmitting}
              >
                {numberOfOccupantsOptions.map((option, index) => (
                  <Picker.Item key={index} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Employment Details</Text>
          <View style={styles.pickerRow}>
            <Text style={styles.pickerLabel}>Employment Status:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={employmentStatus}
                onValueChange={(itemValue) => setEmploymentStatus(itemValue)}
                style={styles.picker}
                enabled={!isSubmitting}
              >
                {employmentStatusOptions.map((option, index) => (
                  <Picker.Item key={index} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
          </View>

          {employmentStatus !== 'unemployed' && employmentStatus !== 'student' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Current Employer / Business Name"
                placeholderTextColor={colors.light.textSecondary}
                value={currentEmployer}
                onChangeText={setCurrentEmployer}
                editable={!isSubmitting}
              />
              <TextInput
                style={styles.input}
                placeholder="Monthly Income (₦)"
                placeholderTextColor={colors.light.textSecondary}
                keyboardType="numeric"
                value={monthlyIncome}
                onChangeText={setMonthlyIncome}
                editable={!isSubmitting}
              />
            </>
          )}

          <Text style={styles.sectionTitle}>Additional Information</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Reason for Moving"
            placeholderTextColor={colors.light.textSecondary}
            multiline
            numberOfLines={4}
            value={reasonForMoving}
            onChangeText={setReasonForMoving}
            editable={!isSubmitting}
          />

          <Text style={styles.sectionTitle}>Contact Preference</Text>
          <View style={styles.toggleButtons}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                contactPreference === 'email' && styles.selectedToggleButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={() => setContactPreference('email')}
              disabled={isSubmitting}
            >
              <Text style={[styles.toggleButtonText, contactPreference === 'email' && styles.selectedToggleButtonText]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                contactPreference === 'phone' && styles.selectedToggleButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={() => setContactPreference('phone')}
              disabled={isSubmitting}
            >
              <Text style={[styles.toggleButtonText, contactPreference === 'phone' && styles.selectedToggleButtonText]}>Phone</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitApplication}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.light.card} />
            ) : (
              <Text style={styles.buttonText}>Submit Application</Text>
            )}
          </TouchableOpacity>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.background,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.light.primaryDark,
    marginBottom: 10,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.light.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: colors.light.card,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: colors.light.textPrimary,
    borderWidth: 1,
    borderColor: colors.light.border,
    fontFamily: 'Inter-Regular',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Bold',
    marginTop: 20,
    marginBottom: 10,
    width: '100%',
    textAlign: 'left',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: 5,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
    backgroundColor: colors.light.card,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  pickerLabel: {
    fontSize: 16,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
    flex: 2,
  },
  pickerWrapper: {
    flex: 1,
    height: 40,
    backgroundColor: colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
    justifyContent: 'center',
    marginLeft: 10,
  },
  picker: {
    width: '100%',
    height: 40,
    color: colors.light.textPrimary,
    paddingHorizontal: 10,
  },
  toggleButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    backgroundColor: colors.light.border,
    borderRadius: 10,
    padding: 5,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  selectedToggleButton: {
    backgroundColor: colors.light.primary,
  },
  toggleButtonText: {
    color: colors.light.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  selectedToggleButtonText: {
    color: colors.light.card,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButton: {
    width: '100%',
    height: 50,
    backgroundColor: colors.light.accent,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.light.accent,
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
