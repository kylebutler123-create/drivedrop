import {useState} from 'react';
import {router} from 'expo-router';
import {Text} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {useSession} from '../../lib/session';
import {PUBLIC_ORIGIN} from '../../lib/links';
import {Action, Card, Notice, Screen, styles} from '../../components/ui';
export default function Account() {
  const {data, signOut} = useSession();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const open = (path: string) => router.push({pathname: '/web', params: {path}});
  return <Screen><Notice text={error}/><Card><Text style={styles.title}>{data?.user.name || 'Your account'}</Text><Text style={styles.body}>{data?.user.email}</Text><Text style={styles.muted}>{data?.user.role === 'TRANSPORTER' ? 'Transporter' : 'Customer'}</Text></Card>
    <Action title="Manage account" onPress={() => open('/account')}/>
    <Action title={data?.user.role === 'TRANSPORTER' ? 'Booked proceeds' : 'Payments and receipts'} secondary onPress={() => open(data?.user.role === 'TRANSPORTER' ? '/transporter/proceeds' : '/payments')}/>
    <Action title="Help and support" secondary onPress={() => open('/help')}/>
    <Action title="Privacy policy" secondary onPress={() => void WebBrowser.openBrowserAsync(`${PUBLIC_ORIGIN}/privacy`)}/>
    <Action title="Terms of service" secondary onPress={() => void WebBrowser.openBrowserAsync(`${PUBLIC_ORIGIN}/terms`)}/>
    <Action title={busy ? 'Signing out…' : 'Sign out'} secondary disabled={busy} onPress={async () => {setBusy(true); try {await signOut();} catch {setError('Unable to remove sign-in from this device. Please try again.');} finally {setBusy(false);}}}/>
  </Screen>;
}
