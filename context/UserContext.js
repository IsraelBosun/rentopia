// context/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { initializeApp } from 'firebase/app'; // Needed for getFirestore if not already initialized globally

// Import your Firebase configuration
import firebaseConfig from '../firebaseConfig'; // Adjust path if you put it in constants/firebaseConfig.js

// Import useAuth to get the current userId
import { useAuth } from './AuthContext';

// Create the User Context
const UserContext = createContext();

/**
 * Custom hook to use the user profile context.
 * @returns {{
 * userProfile: object | null,
 * isLoadingProfile: boolean,
 * error: Error | null
 * }}
 */
export const useUser = () => {
  return useContext(UserContext);
};

/**
 * UserProvider Component
 * Provides the current user's profile data from Firestore to the rest of the app.
 */
export const UserProvider = ({ children }) => {
  const { userId, isAuthenticated, isLoadingAuth } = useAuth(); // Get userId and auth status from AuthContext
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {}; // Initialize unsubscribe function

    const fetchUserProfile = async () => {
      // Ensure Firebase is initialized and user is authenticated and userId is available
      if (!isLoadingAuth && isAuthenticated && userId) {
        setIsLoadingProfile(true);
        setError(null);

        try {
          // Use the imported firebaseConfig
          if (!Object.keys(firebaseConfig).length || !firebaseConfig.projectId) {
            console.error("Firebase config not found or incomplete. Cannot fetch user profile.");
            setIsLoadingProfile(false);
            return;
          }

          // Ensure Firebase app and firestore instance are available
          const firebaseApp = initializeApp(firebaseConfig);
          const db = getFirestore(firebaseApp);

          // For local setup, we need a consistent appId for Firestore paths
          const localAppId = firebaseConfig.appId || firebaseConfig.projectId; // Use your actual appId from firebaseConfig

          // Define the path to the user's profile document
          const userDocRef = doc(db, `artifacts/${localAppId}/users/${userId}/profiles`, userId);

          // Set up a real-time listener for the user's profile document
          unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile({ id: docSnap.id, ...docSnap.data() });
            } else {
              console.warn("User profile document does not exist for ID:", userId);
              setUserProfile(null); // Clear profile if document is deleted
            }
            setIsLoadingProfile(false);
          }, (err) => {
            console.error("Error fetching user profile:", err);
            setError(err);
            setIsLoadingProfile(false);
            setUserProfile(null);
          });
        } catch (err) {
          console.error("Error setting up user profile listener:", err);
          setError(err);
          setIsLoadingProfile(false);
          setUserProfile(null);
        }
      } else if (!isAuthenticated) {
        // If not authenticated, clear profile and stop loading
        setUserProfile(null);
        setIsLoadingProfile(false);
        setError(null);
      }
      // If isLoadingAuth is true, we are still waiting for auth state to be determined
    };

    fetchUserProfile();

    // Cleanup the listener when the component unmounts or userId/isAuthenticated changes
    return () => unsubscribe();
  }, [userId, isAuthenticated, isLoadingAuth]); // Re-run effect if userId, isAuthenticated, or isLoadingAuth changes

  const value = {
    userProfile,
    isLoadingProfile,
    error,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
