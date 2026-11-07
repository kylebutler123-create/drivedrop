import {Redirect, Tabs} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useSession} from '../../lib/session';
import {colors} from '../../components/ui';
export default function TabLayout() {
  const {token} = useSession();
  if (!token) return <Redirect href="/"/>;
  return <Tabs screenOptions={{tabBarActiveTintColor: colors.navy, tabBarInactiveTintColor: colors.muted, headerTintColor: colors.navy, headerShadowVisible: false, tabBarStyle: {backgroundColor: 'white'}}}>
    <Tabs.Screen name="index" options={{title: 'DriveDrop', tabBarLabel: 'Home', tabBarIcon: ({focused, size}) => <Ionicons name="home-outline" color={focused ? colors.navy : colors.muted} size={size}/>}}/>
    <Tabs.Screen name="activity" options={{title: 'Activity', tabBarIcon: ({focused, size}) => <Ionicons name="notifications-outline" color={focused ? colors.navy : colors.muted} size={size}/>}}/>
    <Tabs.Screen name="account" options={{title: 'Account', tabBarIcon: ({focused, size}) => <Ionicons name="person-outline" color={focused ? colors.navy : colors.muted} size={size}/>}}/>
  </Tabs>;
}
