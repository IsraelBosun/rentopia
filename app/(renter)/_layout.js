// app/(renter)/_layout.js
import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons'; // Using FontAwesome for icons
import colors from '../../constants/Colors'; // Correct path to colors
import { StyleSheet } from 'react-native'; // For custom header if needed

/**
 * TabBarIcon Component
 * A helper component to render icons for the tab bar.
 */
function TabBarIcon(props) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

/**
 * RenterLayout Component
 * This layout wraps all screens within the (renter) group, providing a tab bar navigation.
 */
export default function RenterLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.light.primary, // Active tab icon/label color
        tabBarInactiveTintColor: colors.light.textSecondary, // Inactive tab icon/label color
        tabBarStyle: {
          backgroundColor: colors.light.card, // Background color of the tab bar
          borderTopWidth: StyleSheet.hairlineWidth, // Thin line at the top of the tab bar
          borderTopColor: colors.light.border,
          height: 60, // Adjust height as needed
          paddingBottom: 5, // Padding for better icon/label spacing
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Regular', // Apply font to tab labels
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: colors.light.primary, // Header background color
        },
        headerTintColor: colors.light.card, // Header text/icon color
        headerTitleStyle: {
          fontFamily: 'Inter-Bold', // Apply font to header title
          fontSize: 20,
        },
      }}
    >
      {/* Home/Explore Tab */}
      <Tabs.Screen
        name="index" // Corresponds to app/(renter)/index.js
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <TabBarIcon name="compass" color={color} />, // Using 'compass' for exploration
          headerTitle: 'Explore Properties', // Custom header title for this screen
        }}
      />
      {/* Applications Tab */}
      <Tabs.Screen
        name="applications" // Corresponds to app/(renter)/applications.js
        options={{
          title: 'Applications',
          tabBarIcon: ({ color }) => <TabBarIcon name="file-text" color={color} />, // Using 'file-text' for applications
          headerTitle: 'My Applications',
        }}
      />
      {/* Renter Profile Tab */}
      <Tabs.Screen
        name="profile" // Corresponds to app/(renter)/profile.js
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />, // Using 'user' for profile
          headerTitle: 'My Profile',
        }}
      />
      {/* Dynamic Property Details screen - hidden from tabs */}
      <Tabs.Screen
        name="property/[id]" // Corresponds to app/(renter)/property/[id].js
        options={{
          href: null, // Hide this from the tab bar
          headerTitle: 'Property Details',
          headerShown: true,
        }}
      />
    </Tabs>
  );
}
