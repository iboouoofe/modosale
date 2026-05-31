import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ModsaleDarkTheme } from './src/theme/colors';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { registerForPushNotificationsAsync } from './src/services/notifications';

// Inner component that has access to AuthContext
const AppWithPush: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      // Register push notifications silently in background
      registerForPushNotificationsAsync(user.id).catch((err) => {
        console.warn('[App] Push registration skipped:', err?.message);
      });
    }
  }, [user?.id]);

  return (
    <NavigationContainer theme={ModsaleDarkTheme}>
      <AppNavigator />
      <StatusBar style="light" />
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <LocationProvider>
            <AppWithPush />
          </LocationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
