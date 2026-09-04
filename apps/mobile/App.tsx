import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/lib/auth-context';
import { ThemeProvider } from './src/lib/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { VaultPrompt } from './src/components/VaultPrompt';

/**
 * Root component. `ThemeProvider` has to sit *inside* `AuthProvider` — it
 * needs `profile.settings.theme` to resolve light/dark/system, and that only
 * exists once a user is signed in and their profile has loaded. Before that
 * (signed out, or still loading) it falls back to 'system', which is exactly
 * what the web app's unauthenticated auth pages do too.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemedApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { profile } = useAuth();

  return (
    <ThemeProvider preference={profile?.settings.theme ?? 'system'}>
      <RootNavigator />
      <VaultPrompt />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
