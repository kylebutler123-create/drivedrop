import {useCallback} from 'react';
import {router, useFocusEffect} from 'expo-router';
import {ActivityIndicator, Text, View} from 'react-native';
import {useSession} from '../../lib/session';
import {Action, Card, Notice, Screen, styles} from '../../components/ui';
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ');
export default function Home() {
  const {data, refreshing, error, refresh} = useSession();
  useFocusEffect(useCallback(() => {void refresh();}, [refresh]));
  const open = (path: string) => router.push({pathname: '/web', params: {path}});
  return <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
    <Notice text={error}/>
    {!data ? <><ActivityIndicator/><Action title="Try again" onPress={() => void refresh()}/></> : <>
      <View style={styles.hero}><Text style={[styles.eyebrow, {color: '#ffae77'}]}>YOUR DRIVEDROP</Text><Text style={[styles.heading, {color: 'white'}]}>Hello, {data.user.name.split(' ')[0]}</Text><Text style={[styles.body, {color: '#dce6f5'}]}>Your transport, all in one place.</Text></View>
      {data.user.workRestricted && <Notice text="Your account is restricted from new work. You can still manage existing deliveries."/>}
      <Action title={data.user.role === 'CUSTOMER' ? 'Request vehicle transport' : 'Find available jobs'} onPress={() => open(data.user.role === 'CUSTOMER' ? '/get-quotes' : '/transporter')}/>
      <Action title="Quotes and messages" secondary onPress={() => open(data.user.role === 'CUSTOMER' ? '/customer?view=quotes' : '/transporter?view=quotes')}/>
      <Text style={styles.title}>Active deliveries</Text>
      {!data.bookings.length && <Card><Text style={styles.body}>No active deliveries yet.</Text><Text style={styles.muted}>Your confirmed bookings will appear here.</Text></Card>}
      {data.bookings.map(booking => <Card key={booking.id}><Text style={styles.eyebrow}>{label(booking.status)}</Text><Text style={styles.title}>{booking.job.vehicleMake} {booking.job.vehicleModel}</Text><Text style={styles.body}>{booking.job.collection}{'\n'}↓{'\n'}{booking.job.delivery}</Text><Text style={styles.muted}>Collection: {new Date(booking.job.collectionDate).toLocaleDateString('en-GB')}</Text><Action title="View delivery" secondary onPress={() => router.push({pathname: '/delivery/[id]', params: {id: booking.id}})}/></Card>)}
      <Action title="All deliveries and history" secondary onPress={() => open(data.user.role === 'CUSTOMER' ? '/customer?view=bookings' : '/transporter?view=deliveries')}/>
      <Text style={styles.muted}>Updated {new Date(data.fetchedAt).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'})}. Pull down to refresh.</Text>
    </>}
  </Screen>;
}
