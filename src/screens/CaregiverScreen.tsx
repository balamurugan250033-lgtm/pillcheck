import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { storage } from '../services/StorageService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Caregiver'>;
};

export default function CaregiverScreen({ navigation }: Props) {
  const [results, setResults] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const data = await storage.getTodaysScanResults();
      setResults(data);
      const rx = await storage.getTodaysScanResults();
      setPrescriptions(rx);
    };
    loadData();
  }, []);

  const takenCount = results.filter(r => r.userResponse === 'confirm').length;
  const totalCount = results.length || 0;
  const adherence = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Caregiver View</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Today's Adherence</Text>
        <Text style={styles.summaryValue}>{adherence}%</Text>
        <Text style={styles.summaryDetail}>{takenCount} of {totalCount} doses confirmed</Text>
      </View>

      <Text style={styles.sectionTitle}>Active Prescriptions</Text>
      {prescriptions.length === 0 && (
        <Text style={styles.empty}>No prescriptions loaded yet.</Text>
      )}
      {prescriptions.map(rx => (
        <View key={rx.id} style={styles.card}>
          <Text style={styles.cardTitle}>{rx.medicationName || 'Medication'}</Text>
          <Text style={styles.cardDetail}>Last scan: {new Date(rx.timestamp).toLocaleTimeString()}</Text>
          <Text style={[styles.cardStatus, { color: rx.match === 'match' ? '#10b981' : rx.match === 'mismatch' ? '#ef4444' : '#f59e0b' }]}>{rx.match.toUpperCase()}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.closeText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f7f9fc', paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16, color: '#0f172a' },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  summaryValue: { fontSize: 48, fontWeight: '800', color: '#2563eb', marginVertical: 8 },
  summaryDetail: { fontSize: 14, color: '#475569' },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#0f172a' },
  empty: { color: '#64748b', fontSize: 16, marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  cardDetail: { fontSize: 14, color: '#64748b', marginTop: 4 },
  cardStatus: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  closeBtn: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
