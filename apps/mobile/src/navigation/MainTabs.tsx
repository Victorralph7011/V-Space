import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Feather from '@expo/vector-icons/Feather';
import { useDueCount } from '@vspace/core/hooks';
import { useThemeColors } from '../lib/theme';
import ChatScreen from '../screens/chat/ChatScreen';
import LibraryScreen from '../screens/library/LibraryScreen';
import SearchScreen from '../screens/library/SearchScreen';
import MeScreen from '../screens/MeScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Chat · Library · Search · Me — exactly the four tabs the plan specifies.
 *  Reminders is not a fifth tab; it's a segment inside Library, same as the
 *  web app treats it as one of five sections rather than a top-level route. */
export function MainTabs() {
  const colors = useThemeColors();
  const dueCount = useDueCount();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="message-square" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
          tabBarBadge: dueCount > 0 ? dueCount : undefined,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="search" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Me"
        component={MeScreen}
        options={{ tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}
