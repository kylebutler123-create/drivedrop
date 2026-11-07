import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View, RefreshControl} from 'react-native';
export const colors = {navy: '#071c43', orange: '#ff7114', background: '#f4f6fa', text: '#24334a', muted: '#64748b', border: '#dce3ed'};
export function Action({title, onPress, secondary = false, disabled = false}: {title: string; onPress: () => void; secondary?: boolean; disabled?: boolean}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({pressed}) => [styles.action, secondary && styles.secondary, (pressed || disabled) && {opacity: 0.55}]}><Text style={[styles.actionText, secondary && {color: colors.navy}]}>{title}</Text></Pressable>;
}
export function Screen({children, refreshing, onRefresh}: {children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void}) {
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh}/> : undefined}>{children}</ScrollView>;
}
export function Card({children}: {children: React.ReactNode}) {return <View style={styles.card}>{children}</View>;}
export function Notice({text}: {text: string}) {return text ? <View style={styles.notice}><Text accessibilityRole="alert" style={styles.body}>{text}</Text></View> : null;}
export const styles = StyleSheet.create({
  screen: {padding: 22, gap: 18, paddingBottom: 40, flexGrow: 1, backgroundColor: colors.background},
  card: {padding: 20, gap: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: 'white'},
  hero: {padding: 24, gap: 14, borderRadius: 24, backgroundColor: colors.navy},
  heading: {fontSize: 29, lineHeight: 36, fontWeight: '700', color: colors.navy},
  title: {fontSize: 20, lineHeight: 27, fontWeight: '700', color: colors.navy},
  body: {fontSize: 16, lineHeight: 24, color: colors.text},
  muted: {fontSize: 14, lineHeight: 21, color: colors.muted},
  eyebrow: {fontSize: 12, fontWeight: '700', letterSpacing: 1.4, color: colors.orange},
  action: {paddingVertical: 15, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.orange, alignItems: 'center', minHeight: 50},
  actionText: {fontSize: 16, fontWeight: '700', color: colors.navy},
  secondary: {backgroundColor: '#eef2f8'},
  input: {backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, fontSize: 17, color: colors.navy, minHeight: 54},
  label: {fontSize: 14, fontWeight: '600', color: colors.navy},
  notice: {backgroundColor: '#fff3e5', padding: 16, borderRadius: 14},
});
