// services/firestoreService.js
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../firebaseConfig'; // Adjust path as needed

// Initialize Firebase App (ensure this is only done once)
let app;
let db;
let storage;

// --- ADDED DEBUGGING LOGS AND REINFORCED CHECK ---
console.log("FirestoreService: Starting Firebase Initialization...");
console.log("FirestoreService: Loaded firebaseConfig:", firebaseConfig); // Check what config is loaded

try {
  // Check if firebaseConfig is not empty and has essential projectId
  if (!Object.keys(firebaseConfig).length || !firebaseConfig.projectId) {
    console.error("FirestoreService: Firebase config is missing or incomplete. Ensure firebaseConfig.js is correctly set up with projectId.");
    // Do NOT proceed if config is bad, this prevents the _delegate error later
    // The variables (app, db, storage) will remain undefined.
  } else {
    // Attempt to initialize Firebase App
    app = initializeApp(firebaseConfig);
    console.log("FirestoreService: Firebase App initialized status (!!app):", !!app); // Should be true

    // Attempt to get Firestore instance
    db = getFirestore(app);
    console.log("FirestoreService: Firestore DB initialized status (!!db):", !!db); // THIS IS CRUCIAL: Should be true

    // Attempt to get Storage instance
    storage = getStorage(app);
    console.log("FirestoreService: Firebase Storage initialized status (!!storage):", !!storage); // Should be true
  }
} catch (error) {
  console.error("FirestoreService: FATAL ERROR during Firebase Initialization:", error);
  // If an error occurs here, app, db, and storage will remain undefined.
}
// --- END ADDED DEBUGGING LOGS ---


/**
 * Defines standard Firestore collection paths for better organization and security rules.
 */
export const firestorePaths = {
  // Public data (e.g., listings visible to all users)
  // Ensure firebaseConfig.projectId is available here.
  getPublicListingsCollection: () => ({
    path: `artifacts/${firebaseConfig.projectId}/public/data/listings`
  }),
  // User-specific private data (e.g., user profiles)
  getUserProfileDoc: (userId) => ({
    path: `artifacts/${firebaseConfig.projectId}/users/${userId}/profiles`,
    docId: userId
  }),
  // Agent-specific private data (e.g., agent's own listings)
  getAgentListingsCollection: (agentId) => ({
    path: `artifacts/${firebaseConfig.projectId}/users/${agentId}/agentListings`
  }),
  // Renter-specific applications
  getRenterApplicationsCollection: (renterId) => ({
    path: `artifacts/${firebaseConfig.projectId}/users/${renterId}/applications`
  }),
  // NEW: Public Payments Collection
  getPublicPaymentsCollection: () => ({
    path: `artifacts/${firebaseConfig.projectId}/public/data/payments`
  }),
};


/**
 * Adds a new document to a specified Firestore collection.
 * @param {string} collectionPath - The path to the Firestore collection.
 * @param {object} data - The data to be added to the document.
 * @returns {Promise<string>} - The ID of the newly created document.
 */
export const addDocument = async (collectionPath, data) => {
  try {
    // --- REINFORCED CHECK ---
    if (!db) {
      console.error("addDocument: Firestore DB instance is undefined. Throwing error.");
      throw new Error("Firestore is not initialized.");
    }
    // --- END REINFORCED CHECK ---
    const docRef = await addDoc(collection(db, collectionPath), {
      ...data,
      createdAt: serverTimestamp(), // Add server timestamp for creation
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding document:", error);
    throw error;
  }
};

/**
 * Sets (creates or overwrites) a document with a specific ID in a collection.
 * @param {string} collectionPath - The path to the Firestore collection.
 * @param {string} docId - The ID of the document to set.
 * @param {object} data - The data to set in the document.
 * @returns {Promise<void>}
 */
export const setDocument = async (collectionPath, docId, data) => {
  try {
    // --- REINFORCED CHECK ---
    if (!db) {
      console.error("setDocument: Firestore DB instance is undefined. Throwing error.");
      throw new Error("Firestore is not initialized.");
    }
    // --- END REINFORCED CHECK ---
    await setDoc(doc(db, collectionPath, docId), {
      ...data,
      updatedAt: serverTimestamp(), // Add server timestamp for update
    }, { merge: true }); // Use merge to avoid overwriting entire document
  } catch (error) {
    console.error("Error setting document:", error);
    throw error;
  }
};

/**
 * Updates an existing document in a specified Firestore collection.
 * @param {string} collectionPath - The path to the Firestore collection.
 * @param {string} docId - The ID of the document to update.
 * @param {object} data - The data to update in the document.
 * @returns {Promise<void>}
 */
export const updateDocument = async (collectionPath, docId, data) => {
  try {
    // --- REINFORCED CHECK ---
    if (!db) {
      console.error("updateDocument: Firestore DB instance is undefined. Throwing error.");
      throw new Error("Firestore is not initialized.");
    }
    // --- END REINFORCED CHECK ---
    await updateDoc(doc(db, collectionPath, docId), {
      ...data,
      updatedAt: serverTimestamp(), // Add server timestamp for update
    });
  } catch (error) {
    console.error("Error updating document:", error);
    throw error;
  }
};

/**
 * Retrieves a single document by its ID from a specified collection.
 * @param {string} collectionPath - The path to the Firestore collection.
 * @param {string} docId - The ID of the document to retrieve.
 * @returns {Promise<object|null>} - The document data, or null if not found.
 */
export const getDocument = async (collectionPath, docId) => {
  try {
    // --- REINFORCED CHECK ---
    if (!db) {
      console.error("getDocument: Firestore DB instance is undefined. Throwing error.");
      throw new Error("Firestore is not initialized.");
    }
    // --- END REINFORCED CHECK ---
    const docSnap = await getDoc(doc(db, collectionPath, docId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting document:", error);
    throw error;
  }
};

/**
 * Deletes a document from a specified Firestore collection.
 * @param {string} collectionPath - The path to the Firestore collection.
 * @param {string} docId - The ID of the document to delete.
 * @returns {Promise<void>}
 */
export const deleteDocument = async (collectionPath, docId) => {
  try {
    // --- REINFORCED CHECK ---
    if (!db) {
      console.error("deleteDocument: Firestore DB instance is undefined. Throwing error.");
      throw new Error("Firestore is not initialized.");
    }
    // --- END REINFORCED CHECK ---
    await deleteDoc(doc(db, collectionPath, docId));
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
};

/**
 * Fetches all documents from a specified collection.
 * @param {string} collectionPath - The path to the Firestore collection.
 * @returns {Promise<Array<object>>} - An array of document data.
 */
export const getAllDocuments = async (collectionPath) => {
  try {
    // --- REINFORCED CHECK ---
    if (!db) {
      console.error("getAllDocuments: Firestore DB instance is undefined. Throwing error.");
      throw new Error("Firestore is not initialized.");
    }
    // --- END REINFORCED CHECK ---
    const q = query(collection(db, collectionPath));
    const querySnapshot = await getDocs(q);
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return documents;
  } catch (error) {
    console.error("Error getting all documents:", error);
    throw error;
  }
};

/**
 * Sets up a real-time listener for a single document.
 * @param {string} collectionPath - The path to the Firestore collection.
 * @param {string} docId - The ID of the document to listen to.
 * @param {function} callback - Callback function to receive document data (or null if not found).
 * @param {function} onError - Callback function for errors.
 * @returns {function} - An unsubscribe function to stop the listener.
 */
export const listenToDocument = (collectionPath, docId, callback, onError) => {
  // --- REINFORCED CHECK ---
  if (!db) {
    console.error("listenToDocument: Firestore DB instance is undefined. Cannot proceed with query.");
    onError(new Error("Firestore database is not initialized."));
    return () => {}; // Return a no-op unsubscribe function
  }
  // --- END REINFORCED CHECK ---

  const docRef = doc(db, collectionPath, docId);
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error listening to document:", error);
    onError(error);
  });
  return unsubscribe;
};

/**
 * Sets up a real-time listener for a collection of documents.
 * @param {string} collectionPath - The path to the Firestore collection.
 * @param {Array<object>} [conditions=[]] - Optional array of { field, operator, value } for filtering.
 * @param {function} callback - Callback function to receive an array of document data.
 * @param {function} onError - Callback function for errors.
 * @returns {function} - An unsubscribe function to stop the listener.
 */
export const listenToCollection = (collectionPath, conditions = [], callback, onError) => {
  // --- REINFORCED CHECK HERE ---
  if (!db) {
    console.error("listenToCollection: Firestore DB instance is undefined. Cannot proceed with query.");
    onError(new Error("Firestore database is not initialized."));
    return () => {}; // Return a no-op unsubscribe function
  }

  let q;
  try {
    q = collection(db, collectionPath); // This is the line that would throw if 'db' is undefined
  } catch (e) {
    console.error("listenToCollection: Error creating collection reference. Database may be uninitialized or path is invalid:", e);
    onError(new Error("Failed to create collection reference. Database may be uninitialized or path is invalid."));
    return () => {};
  }
  // --- END REINFORCED CHECK ---

  // Apply conditions
  conditions.forEach(condition => {
    q = query(q, where(condition.field, condition.operator, condition.value));
  });

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    callback(documents);
  }, (error) => {
    console.error("Error listening to collection:", error);
    onError(error);
  });
  return unsubscribe;
};


/**
 * Uploads an image file (from a local URI) to Firebase Storage.
 * @param {string} uri - The local URI of the image file (e.g., from ImagePicker).
 * @param {string} userId - The ID of the user uploading the image (for storage path).
 * @returns {Promise<string>} - The public download URL of the uploaded image.
*/
export const uploadImageToFirebaseStorage = async (uri, userId) => {
  // --- REINFORCED CHECK ---
  if (!storage) {
    console.error("uploadImageToFirebaseStorage: Firebase Storage instance is undefined. Throwing error.");
    throw new Error("Firebase Storage is not initialized.");
  }
  // --- END REINFORCED CHECK ---

  // Generate a unique file name
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  // Define the storage path: `listing_images/{userId}/{fileName}`
  const storageRef = ref(storage, `listing_images/${userId}/${fileName}`);

  // Convert URI to Blob
  const response = await fetch(uri);
  const blob = await response.blob();

  // Upload the blob
  const uploadTask = uploadBytesResumable(storageRef, blob);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Optional: Monitor upload progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error("Image upload failed:", error);
        reject(error);
      },
      async () => {
        // Handle successful uploads on complete
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};
