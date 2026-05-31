import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';

// Import screens
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AddListingScreen } from '../screens/AddListingScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { ChatListScreen } from '../screens/ChatListScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { MapScreen } from '../screens/MapScreen';
import { EditListingScreen } from '../screens/EditListingScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { WishListScreen } from '../screens/WishListScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { StoreScreen } from '../screens/StoreScreen';
import { NeighborhoodScreen } from '../screens/NeighborhoodScreen';

// Lucide React Icons
import { Search, PlusCircle, MessageSquare, User, Bell } from 'lucide-react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Nested Main Tab Navigator Flow
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.darkCard,
          borderTopColor: COLORS.darkBorder,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
          paddingBottom: 24,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarActiveTintColor: COLORS.neonAccent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Keşfet"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Search size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="İlan Ver"
        component={AddListingScreen}
        options={{
          tabBarIcon: ({ color }) => <PlusCircle size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Mesajlar"
        component={ChatListScreen}
        options={{
          tabBarIcon: ({ color }) => <MessageSquare size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Bildirimler"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color }) => <Bell size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profilim"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <User size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />

          <Stack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />

          <Stack.Screen
            name="ChatView"
            component={ChatScreen}
            options={{ animation: 'slide_from_bottom' }}
          />

          <Stack.Screen
            name="Review"
            component={ReviewScreen}
            options={{ animation: 'slide_from_bottom' }}
          />

          <Stack.Screen
            name="MapView"
            component={MapScreen}
            options={{ animation: 'slide_from_bottom' }}
          />

          <Stack.Screen
            name="EditListing"
            component={EditListingScreen}
            options={{ animation: 'slide_from_right' }}
          />

          <Stack.Screen
            name="Admin"
            component={AdminScreen}
            options={{ animation: 'slide_from_right' }}
          />

          <Stack.Screen
            name="WishList"
            component={WishListScreen}
            options={{ animation: 'slide_from_right' }}
          />

          <Stack.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{ animation: 'slide_from_right' }}
          />

          <Stack.Screen
            name="Store"
            component={StoreScreen}
            options={{ animation: 'slide_from_right' }}
          />

          <Stack.Screen
            name="Neighborhood"
            component={NeighborhoodScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
