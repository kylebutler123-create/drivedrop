import {useRef, useState} from 'react';
import {Redirect} from 'expo-router';
import {KeyboardAvoidingView, Platform, Text, TextInput} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {useSession} from '../lib/session';
import {PUBLIC_ORIGIN} from '../lib/links';
import {Action, Notice, Screen, styles} from '../components/ui';
export default function Login() {
  const {signIn, token} = useSession();
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const pending = useRef(false);
  if (token) return <Redirect href="/(tabs)"/>;
  async function submit() {
    if (pending.current) return;
    if (!email.trim() || !password) {setError('Enter your email and password.'); return;}
    pending.current = true; setBusy(true); setError('');
    try {await signIn(email, password); setPassword('');}
    catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to sign in.');}
    finally {pending.current = false; setBusy(false);}
  }
  return <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen>
    <Text style={styles.heading}>Welcome back</Text><Text style={styles.body}>Use your existing DriveDrop customer or transporter account.</Text>
    <Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Email" style={styles.input} value={email} onChangeText={setEmail} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"/>
    <Text style={styles.label}>Password</Text><TextInput accessibilityLabel="Password" style={styles.input} value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoCapitalize="none" autoComplete="current-password" onSubmitEditing={() => void submit()}/>
    <Notice text={error}/><Action title={busy ? 'Signing in…' : 'Sign in'} disabled={busy} onPress={() => void submit()}/>
    <Action title="Forgot password?" secondary onPress={() => void WebBrowser.openBrowserAsync(`${PUBLIC_ORIGIN}/forgot-password`)}/>
  </Screen></KeyboardAvoidingView>;
}
