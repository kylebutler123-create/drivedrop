import {Redirect, router, useLocalSearchParams} from 'expo-router';
import {Alert, Linking, Platform, Text} from 'react-native';
import {useSession} from '../../lib/session';
import {mapUrl} from '../../lib/links';
import {Action, Card, Notice, Screen, styles} from '../../components/ui';
export default function Delivery() {
  const {id} = useLocalSearchParams<{id: string}>();
  const {data, token, error} = useSession();
  if (!token) return <Redirect href="/"/>;
  const booking = data?.bookings.find(item => item.id === id);
  if (!booking) return <Screen><Text style={styles.title}>Delivery not in your active list</Text><Text style={styles.body}>Refresh your home screen or open delivery history.</Text><Action title="Back to home" onPress={() => router.replace('/(tabs)')}/></Screen>;
  const root = data?.user.role === 'CUSTOMER' ? '/customer?view=bookings' : '/transporter?view=deliveries';
  async function directions(address: string) {try {await Linking.openURL(mapUrl(address, Platform.OS));} catch {Alert.alert('Unable to open Maps', 'Please open your maps app and enter the address shown.');}}
  return <Screen><Notice text={error}/><Text style={styles.eyebrow}>{booking.status.replaceAll('_', ' ')}</Text><Text style={styles.heading}>{booking.job.vehicleMake} {booking.job.vehicleModel}</Text><Text style={styles.muted}>{booking.job.registration || 'Vehicle transport'}</Text>
    <Card><Text style={styles.eyebrow}>COLLECTION</Text><Text selectable style={styles.body}>{booking.job.collection}</Text><Text style={styles.muted}>{new Date(booking.job.collectionDate).toLocaleDateString('en-GB')}{booking.job.collectionFrom ? ` · ${booking.job.collectionFrom}–${booking.job.collectionUntil || ''}` : ''}</Text><Action title="Directions to collection" secondary onPress={() => void directions(booking.job.collection)}/></Card>
    <Card><Text style={styles.eyebrow}>DELIVERY</Text><Text selectable style={styles.body}>{booking.job.delivery}</Text><Action title="Directions to delivery" secondary onPress={() => void directions(booking.job.delivery)}/></Card>
    <Action title="Manage this delivery" onPress={() => router.push({pathname: '/web', params: {path: `${root}&bookingId=${encodeURIComponent(booking.id)}`}})}/>
    <Action title="Open conversation" secondary onPress={() => router.push({pathname: '/web', params: {path: `/messages?bookingId=${encodeURIComponent(booking.id)}`}})}/>
    <Text style={styles.muted}>Maps opens the phone’s mapping service using this address. Always check the route is suitable for your vehicle.</Text>
  </Screen>;
}
