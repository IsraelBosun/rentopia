// import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// import { useFonts } from 'expo-font';
// import { Stack } from 'expo-router';
// import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated';

// import { useColorScheme } from '@/hooks/useColorScheme';

// export default function RootLayout() {
//   const colorScheme = useColorScheme();
//   const [loaded] = useFonts({
//     SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
//   });

//   if (!loaded) {
//     // Async font loading only occurs in development.
//     return null;
//   }

//   return (
//     <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
//       <Stack>
//         <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//         <Stack.Screen name="+not-found" />
//       </Stack>
//       <StatusBar style="auto" />
//     </ThemeProvider>
//   );
// }










// app/_layout.js
import React, { useEffect, useState } from 'react';
import { Stack, SplashScreen, router } from 'expo-router';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';

// Import your AuthContext and UserContext (we'll create these next)
import { AuthProvider, useAuth } from '../context/AuthContext';
import { UserProvider } from '../context/UserContext';
import colors from '../constants/Colors'; // Import your colors

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

/**
 * RootLayoutContent Component
 * This component handles the authentication logic and conditional rendering
 * based on user's login status and role. It's wrapped by AuthProvider and UserProvider.
 */
function RootLayoutContent() {
  const { isAuthenticated, userRole, isLoadingAuth } = useAuth(); // Get auth state from context
  const [fontsLoaded, fontError] = useFonts({
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
    // 'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    // Add other Inter font weights if needed
  });

  // Effect to hide splash screen once fonts are loaded and auth check is done
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Effect to handle redirection based on authentication status and role
  useEffect(() => {
    if (!isLoadingAuth && (fontsLoaded || fontError)) {
      if (isAuthenticated) {
        // User is authenticated, redirect based on role
        if (userRole === 'renter') {
          router.replace('/(renter)'); // Go to renter's main screen
        } else if (userRole === 'agent') {
          router.replace('/(agent)'); // Go to agent's main screen
        } else {
          // Handle unknown role or default authenticated landing
          router.replace('/(renter)'); // Default to renter if role is undefined
        }
      } else {
        // User is not authenticated, go to login/register
        router.replace('/(auth)/login'); // Or '/auth/register' if you prefer
      }
    }
  }, [isAuthenticated, userRole, isLoadingAuth, fontsLoaded, fontError]);

  // Show a loading indicator while fonts are loading or auth is being checked
  if (!fontsLoaded && !fontError || isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading RentFree...</Text>
      </View>
    );
  }

  // If fonts are loaded and auth check is done, render the appropriate stack
  return (
    <Stack>
      {/*
        The (auth) group will handle login/register.
        The (renter) group will handle renter-specific tabs/screens.
        The (agent) group will handle agent-specific tabs/screens.
        Expo Router automatically handles showing the correct group based on the URL.
        The `useEffect` above ensures the correct initial URL is set.
      */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(renter)" options={{ headerShown: false }} />
      <Stack.Screen name="(agent)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
    </Stack>
  );
}

/**
 * RootLayout Component
 * This is the main component exported by app/_layout.js.
 * It provides the AuthContext and UserContext to the entire application.
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <UserProvider>
        <RootLayoutContent />
      </UserProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
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
  },
});
