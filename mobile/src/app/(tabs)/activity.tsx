import {useCallback} from 'react';
import {router, useFocusEffect} from 'expo-router';
import {Text} from 'react-native';
import {useSession} from '../../lib/session';
import {Action, Card, Notice, Screen, styles} from '../../components/ui';
export default function Activity() {
  const {data, refreshing, error, refresh} = useSession();
  useFocusEffect(useCallback(() => {void refresh();}, [refresh]));
  return <Screen refreshing={refreshing} onRefresh={() => void refresh()}><Notice text={error}/><Text style={styles.heading}>Latest updates</Text>
    <Action title="Open messages" onPress={() => router.push({pathname: '/web', params: {path: '/messages'}})}/>
    {data && !data.notifications.length && <Text style={styles.body}>You’re all caught up. New account and delivery updates will appear here.</Text>}
    {data?.notifications.map(item => <Card key={item.id}><Text style={styles.eyebrow}>{item.readAt ? 'UPDATE' : 'UNREAD'}</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.body}>{item.body}</Text><Text style={styles.muted}>{new Date(item.createdAt).toLocaleString('en-GB')}</Text>{item.href && <Action title="View update" secondary onPress={() => router.push({pathname: '/web', params: {path: item.href!}})}/>}</Card>)}
    <Action title="All notifications" secondary onPress={() => router.push({pathname: '/web', params: {path: '/notifications'}})}/>
  </Screen>;
}
