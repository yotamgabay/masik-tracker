import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { DataProvider } from '../lib/store';
import { C } from '../components/theme';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'he';
}

export default function RootLayout() {
  return (
    <DataProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700', fontSize: 20 },
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: '🫒 המסיקים שלי' }} />
        <Stack.Screen name="stats" options={{ title: 'סטטיסטיקות' }} />
        <Stack.Screen name="settings" options={{ title: 'הגדרות' }} />
        <Stack.Screen name="chat" options={{ title: '💬 העוזר של המסיק' }} />
      </Stack>
    </DataProvider>
  );
}
