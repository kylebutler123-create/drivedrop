import {useMemo, useRef, useState} from 'react';
import {Redirect, useLocalSearchParams} from 'expo-router';
import {ActivityIndicator, Alert, Linking, View} from 'react-native';
import {WebView} from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import {useSession} from '../lib/session';
import {API_ORIGIN, navigationKind, webPath} from '../lib/links';
import {Action, Notice, Screen} from '../components/ui';

export default function WebFlow() {
  const {path} = useLocalSearchParams<{path: string}>();
  const {token, refresh} = useSession();
  const destination = webPath(path);
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [windowUrl, setWindowUrl] = useState<string | null>(null);
  const opening = useRef(false);
  const source = useMemo(() => windowUrl ? {uri: windowUrl} : ({uri: `${API_ORIGIN}/api/mobile/open-web`, method: 'POST' as const,
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({token: token || '', path: destination || '/account'}).toString(),
  }), [destination, token, windowUrl]);
  if (!token) return <Redirect href="/"/>;
  if (!destination) return <Screen><Notice text="This link is not available in DriveDrop."/></Screen>;
  async function external(url: string) {
    if (opening.current) return;
    opening.current = true;
    try {if (navigationKind(url) === 'telephone') await Linking.openURL(url); else await WebBrowser.openBrowserAsync(url); await refresh();}
    catch {Alert.alert('Unable to open this link', 'Please try again.');}
    finally {opening.current = false;}
  }
  return <View style={{flex: 1}}>{error ? <Screen><Notice text={error}/><Action title="Try again" onPress={() => {setError(''); setAttempt(value => value + 1);}}/></Screen> :
    <WebView key={attempt} source={source} incognito sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false}
      originWhitelist={['*']} mixedContentMode="never" allowFileAccess={false} allowUniversalAccessFromFileURLs={false}
      javaScriptCanOpenWindowsAutomatically={false} webviewDebuggingEnabled={false} geolocationEnabled
      startInLoadingState renderLoading={() => <ActivityIndicator accessibilityLabel="Opening DriveDrop"/>}
      onShouldStartLoadWithRequest={request => {
        const kind = navigationKind(request.url);
        if (kind === 'internal') return true;
        if (request.isTopFrame === false) {
          try {const url = new URL(request.url); return url.protocol === 'https:' && ['www.google.com', 'www.openstreetmap.org'].includes(url.hostname);} catch {return false;}
        }
        if (kind === 'external' || kind === 'telephone') void external(request.url);
        else Alert.alert('Link unavailable', 'This destination cannot be opened inside DriveDrop.');
        return false;
      }}
      onOpenWindow={event => {const url = event.nativeEvent.targetUrl; const kind = navigationKind(url); if (kind === 'internal') setWindowUrl(url); else if (['external', 'telephone'].includes(kind)) void external(url);}}
      onError={() => setError('Unable to load this page. Check your connection and try again.')}
      onHttpError={event => {if (event.nativeEvent.statusCode >= 400) setError(event.nativeEvent.statusCode === 401 ? 'Your session has ended. Close this screen and sign in again.' : 'Unable to open this page right now.');}}
    />}</View>;
}
