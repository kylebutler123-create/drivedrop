import {Redirect, router} from 'expo-router';
import {ActivityIndicator, Image, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import {useSession} from '../lib/session';
import {Action, Notice, Screen, styles} from '../components/ui';
import {PUBLIC_ORIGIN} from '../lib/links';
export default function Welcome() {
  const {token, loading, error} = useSession();
  if (loading) return <SafeAreaView style={{flex: 1, justifyContent: 'center'}}><ActivityIndicator accessibilityLabel="Loading DriveDrop"/></SafeAreaView>;
  if (token) return <Redirect href="/(tabs)"/>;
  return <SafeAreaView style={{flex: 1}}><Screen>
    <Image source={require('../../assets/icon.png')} style={{width: 92, height: 92, borderRadius: 22}} accessibilityLabel="DriveDrop"/>
    <Text style={styles.eyebrow}>DRIVEDROP</Text><Text style={styles.heading}>Your next move,{ '\n' }simplified.</Text>
    <Text style={styles.body}>Vehicle transport across the UK. Request quotes, manage deliveries and keep in touch, wherever your day takes you.</Text>
    <Notice text={error}/><View style={{flex: 1, minHeight: 24}}/>
    <Action title="Sign in to DriveDrop" onPress={() => router.push('/login')}/>
    <Action title="Create an account" secondary onPress={() => void WebBrowser.openBrowserAsync(`${PUBLIC_ORIGIN}/register`)}/>
    <Action title="How DriveDrop works" secondary onPress={() => void WebBrowser.openBrowserAsync(`${PUBLIC_ORIGIN}/how-it-works`)}/>
    <Text style={styles.muted} onPress={() => void WebBrowser.openBrowserAsync(`${PUBLIC_ORIGIN}/privacy`)} accessibilityRole="link">Privacy policy</Text>
  </Screen></SafeAreaView>;
}
