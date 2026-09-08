import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useApp } from '../store/context';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

export default function SettingsScreen({ navigation }: Props) {
  const { settings, updateSettings } = useApp();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Accessibility</Text>
        <SettingRow label="Large Print" value={settings.largePrint} onChange={(v) => updateSettings({ largePrint: v })} />
        <SettingRow label="One-Hand Mode" value={settings.oneHandMode} onChange={(v) => updateSettings({ oneHandMode: v })} />
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Feedback</Text>
        <SettingRow label="Vibration" value={settings.vibrationEnabled} onChange={(v) => updateSettings({ vibrationEnabled: v })} />
        <SettingRow label="Screen Flash" value={settings.screenFlashEnabled} onChange={(v) => updateSettings({ screenFlashEnabled: v })} />
        <SettingRow label="Shake to Snooze" value={settings.shakeToSnooze} onChange={(v) => updateSettings({ shakeToSnooze: v })} />
      </View>

      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.closeText}>Save & Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SettingRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f7f9fc', paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16, color: '#0f172a' },
  group: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  groupTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 12, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowLabel: { fontSize: 16, color: '#0f172a', fontWeight: '600' },
  closeBtn: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
