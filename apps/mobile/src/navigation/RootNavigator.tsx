import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../lib/auth-context';
import { useThemeColors } from '../lib/theme';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import ItemDetailScreen from '../screens/item/ItemDetailScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * The auth boundary for the whole app — the mobile counterpart to the
 * `(app)/layout.tsx` redirect-guard on web. Switches between the auth stack
 * and the main tabs based on `user` from `AuthProvider`; nothing renders
 * either until `loading` resolves, so the tabs never mount for a
 * not-yet-determined session and briefly flash signed-out content.
 */
export function RootNavigator() {
  const { user, loading } = useAuth();
  const colors = useThemeColors();

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg,
      card: colors.bgElevated,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
    },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.textFaint} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? (
        <Stack.Navigator>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="ItemDetail"
            component={ItemDetailScreen}
            options={{
              title: '',
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
            }}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
