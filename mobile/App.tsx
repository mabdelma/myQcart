import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import MenuScreen from './src/screens/MenuScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import AccountScreen from './src/screens/AccountScreen';
import { handleDeepLink } from './src/services/deepLink';

type TabParamList = {
  Menu: { slug?: string };
  Orders: { slug?: string };
  Account: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TabIcon: React.FC<{ label: string; focused: boolean }> = ({
  label,
  focused,
}) => (
  <View style={{ alignItems: 'center' }}>
    <Text style={{ fontSize: 20, color: focused ? '#2563eb' : '#6b7280' }}>
      {label === 'Menu' ? '🍽️' : label === 'Orders' ? '📋' : '👤'}
    </Text>
  </View>
);

export default function App() {
  const [slug, setSlug] = useState<string>('demo-cafe');

  const handleUrl = useCallback((url: string) => {
    const resolved = handleDeepLink(url);
    if (resolved) {
      setSlug(resolved.slug);
    }
  }, []);

  useEffect(() => {
    // Linking.addEventListener('url', (event) => handleUrl(event.url));
    // TODO: Uncomment above and set up Linking for production deep links
  }, [handleUrl]);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#6b7280',
        }}
      >
        <Tab.Screen
          name="Menu"
          component={MenuScreen}
          initialParams={{ slug }}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Menu" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Orders"
          component={OrdersScreen}
          initialParams={{ slug }}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Orders" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Account"
          component={AccountScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Account" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
      {/* QR Scanner placeholder:
          import { CameraView } from 'expo-camera';
          <CameraView
            facing="back"
            onBarcodeScanned={({ data }) => handleUrl(data)}
          />
      */}
    </NavigationContainer>
  );
}
