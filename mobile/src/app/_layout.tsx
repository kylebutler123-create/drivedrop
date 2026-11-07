import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SessionProvider} from '../lib/session';
import {colors} from '../components/ui';
export default function Layout() {
  return <SessionProvider><StatusBar style="dark"/><Stack screenOptions={{headerTintColor: colors.navy, headerShadowVisible: false, contentStyle: {backgroundColor: colors.background}}}>
    <Stack.Screen name="index" options={{headerShown: false}}/>
    <Stack.Screen name="login" options={{title: 'Sign in'}}/>
    <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
    <Stack.Screen name="delivery/[id]" options={{title: 'Delivery'}}/>
    <Stack.Screen name="web" options={{title: 'DriveDrop', presentation: 'modal'}}/>
  </Stack></SessionProvider>;
}
