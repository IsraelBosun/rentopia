// app/(agent)/listings/create.js
import React, { useState, useCallback } from 'react';
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
  Image // Import Image for displaying previews
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker'; // Import ImagePicker
import { useAuth } from '../../../context/AuthContext';
import { addDocument, firestorePaths, uploadImageToFirebaseStorage } from '../../../services/firestoreService'; // Import upload function
import colors from '../../../constants/Colors';
import { FontAwesome } from '@expo/vector-icons'; // For plus/minus icons and camera icon

/**
 * Helper function to generate options for numbers (e.g., beds, restrooms, kitchens)
 * Starts from 0.
 */
const generateNumberOptions = (max) => {
  const options = [{ label: 'Select', value: '' }]; // Default "Select" option
  for (let i = 0; i <= max; i++) {
    options.push({ label: String(i), value: String(i) });
  }
  return options;
};

/**
 * Helper function to generate options for percentages (e.g., fees)
 */
const generatePercentageOptions = (maxPercentage, step = 0.5) => {
  const options = [{ label: 'Select', value: '' }]; // Default "Select" option
  for (let i = 0; i <= maxPercentage; i += step) {
    options.push({ label: `${i}%`, value: String(i) });
  }
  return options;
};

// Options for dropdowns
const bedOptions = generateNumberOptions(10);
const kitchenOptions = generateNumberOptions(5); // Assuming max 5 kitchens
const restroomOptions = generateNumberOptions(10);
const feePercentageOptions = generatePercentageOptions(10, 0.5); // Max 10% for agent/legal

/**
 * CreateListingScreen Component
 * Allows agents to create a new property listing with strict details, transparent fee structure,
 * dynamic service charges, and image uploads.
 */
export default function CreateListingScreen() {
  const { userId, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [numBeds, setNumBeds] = useState('');
  const [numKitchens, setNumKitchens] = useState('');
  const [numRestrooms, setNumRestrooms] = useState('');
  const [agencyFeePercentage, setAgencyFeePercentage] = useState('');
  const [legalHandlingOption, setLegalHandlingOption] = useState('platform');
  const [legalFeePercentage, setLegalFeePercentage] = useState('');
  const platformFixedLegalFee = 3;
  const platformFeePercentage = 2;
  const [lawyerName, setLawyerName] = useState('');
  const [nbaId, setNbaId] = useState('');
  const [serviceCharges, setServiceCharges] = useState([{ key: '', value: '' }]);
  const [images, setImages] = useState([]); // New state for selected images (URIs)
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false); // New state for image upload loading

  // Determine the effective legal fee percentage based on the chosen option
  const effectiveLegalFeePercentage = legalHandlingOption === 'platform'
    ? platformFixedLegalFee
    : parseFloat(legalFeePercentage || 0);

  // Function to calculate fees (for display purposes)
  const calculateFees = useCallback(() => {
    const rent = parseFloat(rentAmount);
    if (isNaN(rent) || rent <= 0) return { agencyFee: 0, legalFee: 0, platformFee: 0, totalServiceCharges: 0, totalPayable: 0 };

    const agencyFee = rent * (parseFloat(agencyFeePercentage || 0) / 100);
    const legalFee = rent * (effectiveLegalFeePercentage / 100);
    const platformFee = rent * (platformFeePercentage / 100);

    // Calculate total service charges
    const totalServiceCharges = serviceCharges.reduce((sum, charge) => {
      const chargeValue = parseFloat(charge.value);
      return sum + (isNaN(chargeValue) ? 0 : chargeValue);
    }, 0);

    const totalPayable = rent + agencyFee + legalFee + platformFee + totalServiceCharges;

    return { agencyFee, legalFee, platformFee, totalServiceCharges, totalPayable };
  }, [rentAmount, agencyFeePercentage, effectiveLegalFeePercentage, platformFeePercentage, serviceCharges]);

  const { agencyFee, legalFee, platformFee, totalServiceCharges, totalPayable } = calculateFees();

  /**
   * Handles changes to a specific service charge row.
   * @param {number} index - The index of the service charge row.
   * @param {string} field - 'key' or 'value'.
   * @param {string} text - The new text input.
   */
  const handleServiceChargeChange = (index, field, text) => {
    const newServiceCharges = [...serviceCharges];
    newServiceCharges[index][field] = text;
    setServiceCharges(newServiceCharges);
  };

  /**
   * Adds a new empty service charge row.
   */
  const addServiceChargeRow = () => {
    setServiceCharges([...serviceCharges, { key: '', value: '' }]);
  };

  /**
   * Removes a service charge row by index.
   * @param {number} index - The index of the row to remove.
   */
  const removeServiceChargeRow = (index) => {
    if (serviceCharges.length > 1) {
      const newServiceCharges = serviceCharges.filter((_, i) => i !== index);
      setServiceCharges(newServiceCharges);
    } else {
      setErrorMessage("At least one service charge row is required.");
    }
  };

  /**
   * Handles picking images from the device gallery.
   */
  const pickImage = async () => {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant media library permissions to upload images.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, // Allow multiple image selection
      quality: 0.7, // Reduce quality for faster upload and smaller size
      aspect: [4, 3], // Optional: enforce aspect ratio
      selectionLimit: 10 - images.length, // Limit selection to remaining slots
    });

    if (!result.canceled) {
      // Filter out any assets that don't have a URI
      const newImages = result.assets.filter(asset => asset.uri).map(asset => asset.uri);
      // Combine with existing images, ensuring max 10
      setImages(prevImages => {
        const combined = [...prevImages, ...newImages];
        return combined.slice(0, 10); // Ensure we don't exceed 10 images
      });
    }
  };

  /**
   * Removes an image from the selected images array.
   * @param {string} uri - The URI of the image to remove.
   */
  const removeImage = (uriToRemove) => {
    setImages(prevImages => prevImages.filter(uri => uri !== uriToRemove));
  };


  /**
   * Handles the submission of the new listing form.
   */
  const handleCreateListing = async () => {
    setErrorMessage('');
    setIsLoading(true);
    setIsUploadingImages(false); // Reset image upload status

    // Strict Validation
    if (!title || !description || !address || !rentAmount || !numBeds || !numKitchens || !numRestrooms ||
        !agencyFeePercentage) {
      setErrorMessage('Please fill in all required fields.');
      setIsLoading(false);
      return;
    }
    if (isNaN(parseFloat(rentAmount)) || parseFloat(rentAmount) <= 0) {
      setErrorMessage('Rent amount must be a positive number.');
      setIsLoading(false);
      return;
    }
    if (parseFloat(agencyFeePercentage) > 10) {
      setErrorMessage('Agent Fee cannot exceed 10%.');
      setIsLoading(false);
      return;
    }

    // Conditional Legal Fee and Lawyer Details Validation
    if (legalHandlingOption === 'agent') {
      if (!legalFeePercentage) {
        setErrorMessage('Legal Fee percentage is required if agent handles legal.');
        setIsLoading(false);
        return;
      }
      if (parseFloat(legalFeePercentage) > 10) {
        setErrorMessage('Legal Fee cannot exceed 10% if agent handles legal.');
        setIsLoading(false);
        return;
      }
      if (!lawyerName || !nbaId) {
        setErrorMessage('Lawyer Name and NBA ID are required if agent handles legal.');
        setIsLoading(false);
        return;
      }
    }

    if (!userId) {
      setErrorMessage('Agent not authenticated. Please log in again.');
      setIsLoading(false);
      return;
    }

    // Validate dynamic service charges
    const invalidServiceCharges = serviceCharges.some(charge =>
      !charge.key.trim() || isNaN(parseFloat(charge.value)) || parseFloat(charge.value) <= 0
    );
    if (invalidServiceCharges) {
      setErrorMessage('Please ensure all service charges have a description and a valid positive amount.');
      setIsLoading(false);
      return;
    }

    // Validate images
    if (images.length === 0) {
      setErrorMessage('Please upload at least one image for the property.');
      setIsLoading(false);
      return;
    }

    let imageUrls = [];
    try {
      setIsUploadingImages(true); // Indicate image upload is starting
      // Upload each image to Firebase Storage
      for (const imageUri of images) {
        const downloadUrl = await uploadImageToFirebaseStorage(imageUri, userId);
        imageUrls.push(downloadUrl);
      }
      setIsUploadingImages(false); // Image upload complete
    } catch (imageUploadError) {
      console.error("Error uploading images:", imageUploadError);
      setErrorMessage('Failed to upload images. Please try again.');
      setIsLoading(false);
      setIsUploadingImages(false);
      return;
    }


    try {
      const newListingData = {
        title,
        description,
        address,
        rentAmount: parseFloat(rentAmount),
        numBeds: parseInt(numBeds),
        numKitchens: parseInt(numKitchens),
        numRestrooms: parseInt(numRestrooms),
        agencyFeePercentage: parseFloat(agencyFeePercentage),
        legalHandlingOption: legalHandlingOption,
        legalFeePercentage: legalHandlingOption === 'agent' ? parseFloat(legalFeePercentage) : platformFixedLegalFee,
        platformFeePercentage: platformFeePercentage,
        totalPayable: totalPayable,
        lawyerName: legalHandlingOption === 'agent' ? lawyerName : null,
        nbaId: legalHandlingOption === 'agent' ? nbaId : null,
        agentId: userId,
        agentEmail: user?.email,
        status: 'available',
        createdAt: new Date(),
        serviceCharges: serviceCharges.map(charge => ({
          key: charge.key.trim(),
          value: parseFloat(charge.value),
        })),
        imageUrls: imageUrls, // Save the array of download URLs
      };

      const listingsCollectionPath = firestorePaths.getPublicListingsCollection().path;
      const docId = await addDocument(listingsCollectionPath, newListingData);

      Alert.alert('Success', 'Listing created successfully!', [
        { text: 'OK', onPress: () => router.replace('/agent/listings') }
      ]);
    } catch (error) {
      console.error("Error creating listing:", error);
      setErrorMessage('Failed to create listing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create New Listing</Text>
          <Text style={styles.subtitle}>Enter property details and fee structure</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Property Title (e.g., 3 Bedroom Flat in Lekki)"
            placeholderTextColor={colors.light.textSecondary}
            value={title}
            onChangeText={setTitle}
            editable={!isLoading && !isUploadingImages}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detailed Description"
            placeholderTextColor={colors.light.textSecondary}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            editable={!isLoading && !isUploadingImages}
          />
          <TextInput
            style={styles.input}
            placeholder="Full Address (e.g., 123 Main St, Lekki Phase 1, Lagos)"
            placeholderTextColor={colors.light.textSecondary}
            value={address}
            onChangeText={setAddress}
            editable={!isLoading && !isUploadingImages}
          />
          <TextInput
            style={styles.input}
            placeholder="Rent Amount (₦)"
            placeholderTextColor={colors.light.textSecondary}
            keyboardType="numeric"
            value={rentAmount}
            onChangeText={setRentAmount}
            editable={!isLoading && !isUploadingImages}
          />

          {/* Dropdowns for property details */}
          <View style={styles.dropdownRow}>
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Beds:</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={numBeds}
                  onValueChange={(itemValue) => setNumBeds(itemValue)}
                  style={styles.picker}
                  enabled={!isLoading && !isUploadingImages}
                >
                  {bedOptions.map((option, index) => (
                    <Picker.Item key={index} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Kitchens:</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={numKitchens}
                  onValueChange={(itemValue) => setNumKitchens(itemValue)}
                  style={styles.picker}
                  enabled={!isLoading && !isUploadingImages}
                >
                  {kitchenOptions.map((option, index) => (
                    <Picker.Item key={index} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Restrooms:</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={numRestrooms}
                  onValueChange={(itemValue) => setNumRestrooms(itemValue)}
                  style={styles.picker}
                  enabled={!isLoading && !isUploadingImages}
                >
                  {restroomOptions.map((option, index) => (
                    <Picker.Item key={index} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Fee Structure Inputs */}
          <Text style={styles.sectionTitle}>Fee Structure</Text>
          <View style={styles.feeInputRow}>
            <Text style={styles.feeLabel}>Agent Fee (Max 10%):</Text>
            <View style={styles.pickerWrapperSmall}>
              <Picker
                selectedValue={agencyFeePercentage}
                onValueChange={(itemValue) => setAgencyFeePercentage(itemValue)}
                style={styles.pickerSmall}
                enabled={!isLoading && !isUploadingImages}
              >
                {feePercentageOptions.map((option, index) => (
                  <Picker.Item key={index} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Legal Handling Option */}
          <View style={styles.legalHandlingContainer}>
            <Text style={styles.legalHandlingLabel}>Legal Handled By:</Text>
            <View style={styles.toggleButtons}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  legalHandlingOption === 'platform' && styles.selectedToggleButton,
                  (isLoading || isUploadingImages) && styles.disabledButton,
                ]}
                onPress={() => setLegalHandlingOption('platform')}
                disabled={isLoading || isUploadingImages}
              >
                <Text style={[styles.toggleButtonText, legalHandlingOption === 'platform' && styles.selectedToggleButtonText]}>Platform (Fixed 3%)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  legalHandlingOption === 'agent' && styles.selectedToggleButton,
                  (isLoading || isUploadingImages) && styles.disabledButton,
                ]}
                onPress={() => setLegalHandlingOption('agent')}
                disabled={isLoading || isUploadingImages}
              >
                <Text style={[styles.toggleButtonText, legalHandlingOption === 'agent' && styles.selectedToggleButtonText]}>Agent (Max 10%)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Conditional Legal Fee Input */}
          {legalHandlingOption === 'agent' ? (
            <View style={styles.feeInputRow}>
              <Text style={styles.feeLabel}>Legal Fee (Max 10%):</Text>
              <View style={styles.pickerWrapperSmall}>
                <Picker
                  selectedValue={legalFeePercentage}
                  onValueChange={(itemValue) => setLegalFeePercentage(itemValue)}
                  style={styles.pickerSmall}
                  enabled={!isLoading && !isUploadingImages}
                >
                  {feePercentageOptions.map((option, index) => (
                    <Picker.Item key={index} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
          ) : (
            <View style={styles.feeInputRow}>
              <Text style={styles.feeLabel}>Legal Fee (Fixed):</Text>
              <Text style={styles.fixedFeeText}>{platformFixedLegalFee}%</Text>
            </View>
          )}

          <View style={styles.feeInputRow}>
            <Text style={styles.feeLabel}>Platform Fee (Fixed):</Text>
            <Text style={styles.fixedFeeText}>{platformFeePercentage}%</Text>
          </View>

          {/* Dynamic Service Charges Section */}
          <Text style={styles.sectionTitle}>Additional Service Charges</Text>
          {serviceCharges.map((charge, index) => (
            <View key={index} style={styles.serviceChargeRow}>
              <TextInput
                style={[styles.serviceChargeInput, { flex: 2 }]}
                placeholder="Charge Description (e.g., Waste Management)"
                placeholderTextColor={colors.light.textSecondary}
                value={charge.key}
                onChangeText={(text) => handleServiceChargeChange(index, 'key', text)}
                editable={!isLoading && !isUploadingImages}
              />
              <TextInput
                style={[styles.serviceChargeInput, { flex: 1, marginLeft: 10 }]}
                placeholder="Amount (₦)"
                placeholderTextColor={colors.light.textSecondary}
                keyboardType="numeric"
                value={charge.value}
                onChangeText={(text) => handleServiceChargeChange(index, 'value', text)}
                editable={!isLoading && !isUploadingImages}
              />
              {serviceCharges.length > 1 && (
                <TouchableOpacity
                  style={styles.removeServiceChargeButton}
                  onPress={() => removeServiceChargeRow(index)}
                  disabled={isLoading || isUploadingImages}
                >
                  <FontAwesome name="minus-circle" size={24} color={colors.light.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity
            style={styles.addServiceChargeButton}
            onPress={addServiceChargeRow}
            disabled={isLoading || isUploadingImages}
          >
            <FontAwesome name="plus-circle" size={20} color={colors.light.card} />
            <Text style={styles.addServiceChargeButtonText}>Add Service Charge</Text>
          </TouchableOpacity>

          {/* Image Upload Section */}
          <Text style={styles.sectionTitle}>Property Images (Max 10)</Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={pickImage}
            disabled={images.length >= 10 || isLoading || isUploadingImages}
          >
            <FontAwesome name="camera" size={20} color={colors.light.card} />
            <Text style={styles.imagePickerButtonText}>
              {images.length === 0 ? 'Upload Images' : `Add More Images (${images.length}/10)`}
            </Text>
          </TouchableOpacity>
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imagePreviewWrapper}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(uri)}>
                    <FontAwesome name="times-circle" size={24} color={colors.light.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}


          {/* Calculated Fees Display */}
          <View style={styles.calculatedFeesContainer}>
            <Text style={styles.calculatedFeeText}>Calculated Agent Fee: ₦{agencyFee.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            <Text style={styles.calculatedFeeText}>Calculated Legal Fee: ₦{legalFee.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            <Text style={styles.calculatedFeeText}>Calculated Platform Fee: ₦{platformFee.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            <Text style={styles.calculatedFeeText}>Total Service Charges: ₦{totalServiceCharges.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            <Text style={styles.totalPayableText}>Total Payable by Renter: ₦{totalPayable.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
          </View>

          {/* Legal Agreement Clause - CONDITIONAL */}
          {legalHandlingOption === 'agent' && (
            <View style={styles.legalClauseContainer}>
              <Text style={styles.legalClauseTitle}>Legal Agreement Requirement:</Text>
              <Text style={styles.legalClauseText}>
                By creating this listing, you agree to provide a legal agreement for the tenancy,
                which must be drafted by a qualified lawyer, properly stamped, and signed by all parties.
                This ensures transparency and legal compliance for the renter.
              </Text>
            </View>
          )}

          {/* Lawyer Details - Conditional Rendering */}
          {legalHandlingOption === 'agent' && (
            <View style={styles.lawyerDetailsContainer}>
              <Text style={styles.sectionTitle}>Lawyer Details</Text>
              <TextInput
                style={styles.input}
                placeholder="Lawyer's Full Name"
                placeholderTextColor={colors.light.textSecondary}
                value={lawyerName}
                onChangeText={setLawyerName}
                editable={!isLoading && !isUploadingImages}
              />
              <TextInput
                style={styles.input}
                placeholder="Lawyer's NBA ID"
                placeholderTextColor={colors.light.textSecondary}
                value={nbaId}
                onChangeText={setNbaId}
                editable={!isLoading && !isUploadingImages}
              />
            </View>
          )}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateListing}
            disabled={isLoading || isUploadingImages} // Disable if images are uploading
          >
            {(isLoading || isUploadingImages) ? (
              <ActivityIndicator color={colors.light.card} />
            ) : (
              <Text style={styles.buttonText}>Create Listing</Text>
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
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  dropdownContainer: {
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  dropdownLabel: {
    fontSize: 14,
    color: colors.light.textSecondary,
    fontFamily: 'Inter-Regular',
    marginBottom: 5,
  },
  pickerWrapper: {
    width: '100%',
    height: 50,
    backgroundColor: colors.light.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: 50,
    color: colors.light.textPrimary,
    paddingHorizontal: 10,
  },
  feeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    backgroundColor: colors.light.card,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  feeLabel: {
    fontSize: 16,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
    flex: 2,
  },
  pickerWrapperSmall: {
    flex: 1,
    height: 40,
    backgroundColor: colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
    justifyContent: 'center',
    marginLeft: 10,
  },
  pickerSmall: {
    width: '100%',
    height: 40,
    color: colors.light.textPrimary,
    paddingHorizontal: 10,
  },
  fixedFeeText: {
    flex: 1,
    fontSize: 16,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Bold',
    textAlign: 'right',
    paddingRight: 10,
  },
  legalHandlingContainer: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  legalHandlingLabel: {
    fontSize: 16,
    color: colors.light.textPrimary,
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
  },
  toggleButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    backgroundColor: colors.light.border,
    borderRadius: 10,
    padding: 5,
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
  serviceChargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
    backgroundColor: colors.light.card,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  serviceChargeInput: {
    height: 40,
    backgroundColor: colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: colors.light.textPrimary,
    borderWidth: 1,
    borderColor: colors.light.border,
    fontFamily: 'Inter-Regular',
  },
  removeServiceChargeButton: {
    marginLeft: 10,
    padding: 5,
  },
  addServiceChargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: colors.light.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  addServiceChargeButtonText: {
    marginLeft: 10,
    color: colors.light.card,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 15,
    shadowColor: colors.light.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  imagePickerButtonText: {
    marginLeft: 10,
    color: colors.light.card,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    width: '100%',
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 2,
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
  legalClauseContainer: {
    width: '100%',
    backgroundColor: colors.light.card,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.light.warning,
  },
  legalClauseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.light.warning,
    fontFamily: 'Inter-Bold',
    marginBottom: 5,
  },
  legalClauseText: {
    fontSize: 14,
    color: colors.light.textPrimary,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  lawyerDetailsContainer: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: 10,
  },
  createButton: {
    width: '100%',
    height: 50,
    backgroundColor: colors.light.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
  errorText: {
    color: colors.light.error,
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    width: '100%',
  },
});
