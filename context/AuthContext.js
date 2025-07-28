// context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  initializeApp
} from 'firebase/app';
import {
  getAuth, // We will replace this with initializeAuth
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';

// NEW IMPORTS FOR PERSISTENCE
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: Correctly import firebaseConfig for Expo Go local development
import firebaseConfig from '../firebaseConfig';

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';


// Create the Auth Context
const AuthContext = createContext();

/**
 * Custom hook to use the authentication context.
 * @returns {{
 * isAuthenticated: boolean,
 * user: object | null,
 * userRole: 'renter' | 'agent' | null,
 * isLoadingAuth: boolean,
 * login: (email, password) => Promise<void>,
 * register: (email, password, role, firstName, lastName, phoneNumber, agentDetails) => Promise<void>,
 * logout: () => Promise<void>
 * }}
 */
export const useAuth = () => {
  return useContext(AuthContext);
};

/**
 * AuthProvider Component
 * Provides authentication state and functions to the rest of the app.
 */
export const AuthProvider = ({
  children
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // Firebase user object
  const [userRole, setUserRole] = useState(null); // 'renter' or 'agent'
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Tracks initial auth check

  // Firebase instances
  const [app, setApp] = useState(null);
  const [auth, setAuth] = useState(null); // This will now be initialized with persistence
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null); // Firestore userId

  // Initialize Firebase and set up auth listener
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        const firebaseApp = initializeApp(firebaseConfig);

        // --- IMPORTANT CHANGE HERE ---
        // Initialize Firebase Auth with persistence
        const firebaseAuth = initializeAuth(firebaseApp, {
          persistence: getReactNativePersistence(ReactNativeAsyncStorage)
        });
        // --- END IMPORTANT CHANGE ---

        const firestoreDb = getFirestore(firebaseApp);

        setApp(firebaseApp);
        setAuth(firebaseAuth); // Set the auth instance initialized with persistence
        setDb(firestoreDb);

        const projectId = firebaseConfig.projectId || (typeof __app_id !== 'undefined' ? __app_id : 'default-app-id');

        // Check for custom token (Canvas runtime)
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (initialAuthToken) {
          await signInWithCustomToken(firebaseAuth, initialAuthToken);
        }

        // Set up auth state change listener
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            const currentUserId = currentUser.uid;
            setUserId(currentUserId);

            let storedRole = await SecureStore.getItemAsync('userRole');
            if (storedRole) {
              setUserRole(storedRole);
              setIsAuthenticated(true);
            } else {
              const userDocRef = doc(firestoreDb, `artifacts/${projectId}/users/${currentUserId}/profiles`, currentUserId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const role = userData.role;
                setUserRole(role);
                setIsAuthenticated(true);
                await SecureStore.setItemAsync('userRole', role);
              } else {
                console.warn("User profile not found in Firestore for authenticated user. Logging out.");
                setIsAuthenticated(false);
                setUser(null);
                setUserRole(null);
                setUserId(null);
                await SecureStore.deleteItemAsync('userRole');
                // Force sign out if profile is missing for a supposedly authenticated user
                await signOut(firebaseAuth);
              }
            }
          } else {
            // User is not authenticated (either logged out, or no initial session)
            setUser(null);
            setIsAuthenticated(false);
            setUserRole(null);
            setUserId(null);
            await SecureStore.deleteItemAsync('userRole');
          }
          setIsLoadingAuth(false); // Auth check complete
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error initializing Firebase or during initial auth check:", error);
        setIsLoadingAuth(false);
        // Ensure state is unauthenticated on initialization error
        setIsAuthenticated(false);
        setUser(null);
        setUserRole(null);
        setUserId(null);
        await SecureStore.deleteItemAsync('userRole');
      }
    };

    initializeFirebase();
  }, []); // Empty dependency array means this runs once on mount


  /**
   * Logs in a user with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   */
  const login = async (email, password) => {
    setIsLoadingAuth(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const currentUser = userCredential.user;
      setUser(currentUser);
      const currentUserId = currentUser.uid;
      setUserId(currentUserId);

      const projectId = firebaseConfig.projectId || (typeof __app_id !== 'undefined' ? __app_id : 'default-app-id');
      const userDocRef = doc(db, `artifacts/${projectId}/users/${currentUserId}/profiles`, currentUserId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const role = userData.role;
        setUserRole(role);
        setIsAuthenticated(true);
        await SecureStore.setItemAsync('userRole', role);
      } else {
        console.error("User profile not found after login. Role not set. Forcing logout.");
        setIsAuthenticated(false);
        await signOut(auth); // Force logout if no role found
        throw new Error("User profile not found. Please contact support or register again.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  /**
   * Registers a new user with email, password, role, and additional profile details.
   * @param {string} email
   * @param {string} password
   * @param {'renter' | 'agent'} role
   * @param {string} firstName
   * @param {string} lastName
   * @param {string} phoneNumber
   * @param {object} agentDetails - Object containing agentAccountType, lasreraNumber, cacNumber (if applicable)
   * @returns {Promise<void>}
   */
  const register = async (email, password, role, firstName, lastName, phoneNumber, agentDetails) => {
    setIsLoadingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const currentUser = userCredential.user;
      setUser(currentUser);
      const currentUserId = currentUser.uid;
      setUserId(currentUserId);

      const projectId = firebaseConfig.projectId || (typeof __app_id !== 'undefined' ? __app_id : 'default-app-id');
      const userDocRef = doc(db, `artifacts/${projectId}/users/${currentUserId}/profiles`, currentUserId);

      const profileData = {
        email: email,
        role: role,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
        createdAt: new Date(),
        userId: currentUserId,
        ...(role === 'agent' && agentDetails ? agentDetails : {}),
      };

      await setDoc(userDocRef, profileData);

      setUserRole(role);
      setIsAuthenticated(true);
      await SecureStore.setItemAsync('userRole', role);
    } catch (error) {
      console.error("Registration failed:", error);
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  /**
   * Logs out the current user.
   * @returns {Promise<void>}
   */
  const logout = async () => {
    setIsLoadingAuth(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const value = {
    isAuthenticated,
    user,
    userRole,
    isLoadingAuth,
    login,
    register,
    logout,
    userId
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
