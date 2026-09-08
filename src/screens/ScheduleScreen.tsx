import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Prescription, ScheduleEntry } from '../types';
import { useApp } from '../store/context';
import { generateTodaysSchedule, getNextDueSchedule } from '../utils/scheduleEngine';
import { SpeechService } from '../services/SpeechService';
import { HapticService } from '../services/HapticService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Schedule'>;
  route: RouteProp<RootStackParamList, 'Schedule'>;
};

export default function ScheduleScreen({ navigation, route }: Props) {
  const { currentPrescription, settings } = useApp();
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const speech = new SpeechService();

  useEffect(() => {
    speech.init();
    if (currentPrescription) {
      const todays = generateTodaysSchedule(currentPrescription.medications);
      setSchedule(todays);
    }
    return () => speech.destroy();
  }, [currentPrescription]);

  useEffect(() => {
    if (route.params?.prescriptionId && currentPrescription?.id !== route.params.prescriptionId) {
      const loaded = generateTodaysSchedule(currentPrescription?.medications || []);
      setSchedule(loaded);
    }
  }, [route.params?.prescriptionId]);

  const nextDue = getNextDueSchedule(schedule);

  const handleScan = (scheduleId: string) => {
    if (!currentPrescription) return;
    HapticService.trigger('select');
    navigation.navigate('TabletScan', {
      prescriptionId: currentPrescription.id,
      scheduleId,
    });
  };

  const speakSchedule = async () => {
    if (schedule.length === 0) return;
    await speech.speak(`You have ${schedule.length} doses today.`);
    for (const s of schedule) {
      const med = currentPrescription?.medications.find(m => m.schedule.some(sc => sc.id === s.id));
      const medName = med?.name || 'medication';
      const status = s.taken ? 'already taken' : s.status === 'skipped' ? 'skipped' : 'due';
      await speech.speak(`${s.time}: ${medName}, ${status}.`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Today's Schedule</Text>
      <TouchableOpacity style={styles.speakBtn} onPress={speakSchedule}>
        <Text style={styles.speakBtnText}>🔊 Read Schedule</Text>
      </TouchableOpacity>

      {nextDue && !nextDue.taken && (
        <View style={styles.nextDueCard}>
          <Text style={styles.nextDueLabel}>NEXT DUE</Text>
          <Text style={styles.nextDueTime}>{nextDue.time}</Text>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => handleScan(nextDue.id)}
          >
            <Text style={styles.scanBtnText}>Scan Tablet Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {schedule.map(s => {
        const med = currentPrescription?.medications.find(m => m.schedule.some(sc => sc.id === s.id));
        const isNext = nextDue?.id === s.id;
        return (
          <View
            key={s.id}
            style={[
              styles.card,
              s.taken && styles.cardTaken,
              isNext && styles.cardNext,
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.time}>{s.time}</Text>
              <Text style={[
                styles.status,
                s.taken ? styles.statusTaken : styles.statusPending
              ]}>
                {s.taken ? 'TAKEN' : s.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.medName}>{med?.name || 'Unknown'}</Text>
            <Text style={styles.dose}>{med?.dose}</Text>
            {s.withFood && <Text style={styles.food}>Take with food</Text>}
            {!s.taken && s.status !== 'skipped' && (
              <TouchableOpacity
                style={styles.cardScanBtn}
                onPress={() => handleScan(s.id)}
              >
                <Text style={styles.cardScanBtnText}>Scan</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f7f9fc',
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    color: '#0f172a',
  },
  speakBtn: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  speakBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  nextDueCard: {
    backgroundColor: '#2563eb',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  nextDueLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  nextDueTime: { color: '#fff', fontSize: 36, fontWeight: '700', marginVertical: 8 },
  scanBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  scanBtnText: { color: '#2563eb', fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e2e8f0',
  },
  cardTaken: { opacity: 0.6 },
  cardNext: { borderLeftColor: '#2563eb' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  time: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  status: { fontSize: 12, fontWeight: '700' },
  statusTaken: { color: '#10b981' },
  statusPending: { color: '#f59e0b' },
  medName: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  dose: { fontSize: 14, color: '#64748b', marginTop: 2 },
  food: { fontSize: 14, color: '#2563eb', marginTop: 4, fontWeight: '600' },
  cardScanBtn: {
    marginTop: 12,
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardScanBtnText: { color: '#2563eb', fontWeight: '600' },
});
