// app/(agent)/_layout.js
import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons'; // Using FontAwesome for icons
import colors from '../../constants/Colors'; // Correct path to colors
import { StyleSheet, Text, View } from 'react-native'; // For custom header if needed

/**
 * TabBarIcon Component
 * A helper component to render icons for the tab bar.
 */
function TabBarIcon(props) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

/**
 * AgentLayout Component
 * This layout wraps all screens within the (agent) group, typically providing a tab bar navigation.
 */
export default function AgentLayout() {
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
      {/* Agent Dashboard Tab */}
      <Tabs.Screen
        name="index" // Corresponds to app/(agent)/index.js
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon name="dashboard" color={color} />,
          headerTitle: 'Agent Dashboard', // Custom header title for this screen
        }}
      />
      {/* Listings Management Tab */}
      <Tabs.Screen
        name="listings" // Corresponds to app/(agent)/listings.js
        options={{
          title: 'Listings',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />, // Using 'home' for property listings
          headerTitle: 'My Listings',
        }}
      />
      {/* Payments Dashboard Tab */}
      <Tabs.Screen
        name="payments" // Corresponds to app/(agent)/payments.js
        options={{
          title: 'Payments',
          tabBarIcon: ({ color }) => <TabBarIcon name="dollar" color={color} />, // Using 'dollar' for payments
          headerTitle: 'Payment History',
        }}
      />
      {/* NEW: Agent Profile Tab */}
      <Tabs.Screen
        name="profile" // Corresponds to app/(agent)/profile.js
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user-circle" color={color} />, // Using 'user-circle' for profile
          headerTitle: 'My Profile',
        }}
      />
      {/* Example of a screen that is part of the stack but not shown in tabs */}
      <Tabs.Screen
        name="listings/create" // Corresponds to app/(agent)/listings/create.js
        options={{
          href: null, // This hides the tab for this screen
          headerTitle: 'Create New Listing',
          headerShown: true, // Ensure header is shown for this screen
          presentation: 'modal', // Often used for creation flows
        }}
      />
      {/* Dynamic Listing Details screen - also hidden from tabs */}
      <Tabs.Screen
        name="listings/[id]" // Corresponds to app/(agent)/listings/[id].js
        options={{
          href: null, // Hide this from the tab bar
          headerTitle: 'Listing Details',
          headerShown: true,
        }}
      />
    </Tabs>
  );
}
