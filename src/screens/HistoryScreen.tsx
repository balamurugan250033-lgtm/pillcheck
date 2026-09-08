import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { storage } from '../services/StorageService';
import { useApp } from '../store/context';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'History'>;
};

export default function HistoryScreen({ navigation }: Props) {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await storage.getTodaysScanResults();
    setResults(data);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Today's History</Text>
      {results.length === 0 && (
        <Text style={styles.empty}>No scans today yet.</Text>
      )}
      {results.map(r => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.time}>{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          <Text style={[styles.verdict, { color: r.match === 'match' ? '#10b981' : r.match === 'mismatch' ? '#ef4444' : '#f59e0b' }]}>{r.match.toUpperCase()}</Text>
          <Text style={styles.confidence}>Confidence: {Math.round((r.confidence || 0) * 100)}%</Text>
          <Text style={styles.response}>Response: {r.userResponse}</Text>
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
  empty: { color: '#64748b', fontSize: 16, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  time: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  verdict: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  match: { color: '#10b981' },
  mismatch: { color: '#ef4444' },
  uncertain: { color: '#f59e0b' },
  confidence: { fontSize: 14, color: '#475569' },
  response: { fontSize: 14, color: '#475569', marginTop: 4 },
  closeBtn: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
