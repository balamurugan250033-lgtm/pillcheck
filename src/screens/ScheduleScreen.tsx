import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, ScheduleEntry } from '../types';
import { generateTodaysSchedule, getNextDueSchedule } from '../utils/scheduleEngine';
import { useApp } from '../store/context';
import { SpeechService } from '../services/SpeechService';
import { HapticService } from '../services/HapticService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Schedule'>;
  route: RouteProp<RootStackParamList, 'Schedule'>;
};

export default function ScheduleScreen({ navigation, route }: Props) {
  const { currentPrescription } = useApp();
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const speech = useMemo(() => new SpeechService(), []);

  useEffect(() => {
    speech.init();
    if (currentPrescription) {
      const todays = generateTodaysSchedule(currentPrescription.medications);
      setSchedule(todays);
    }
    return () => {
      speech.destroy();
    };
  }, [currentPrescription, speech]);

  useEffect(() => {
    if (route.params?.prescriptionId && currentPrescription?.id === route.params.prescriptionId) {
      const loaded = generateTodaysSchedule(currentPrescription.medications || []);
      setSchedule(loaded);
    }
  }, [route.params?.prescriptionId, currentPrescription]);

  const nextDue = getNextDueSchedule(schedule);

  const handleScan = useCallback((scheduleId: string) => {
    if (!currentPrescription) {
      return;
    }
    HapticService.trigger('select');
    navigation.navigate('TabletScan', {
      prescriptionId: currentPrescription.id,
      scheduleId,
    });
  }, [currentPrescription, navigation]);

  const speakSchedule = useCallback(() => {
    if (schedule.length === 0) {
      return;
    }
    const text = `Today you have ${schedule.length} doses. The next one is at ${nextDue?.time || 'later'}.`;
    speech.speak(text);
  }, [schedule, nextDue, speech]);

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
                s.taken ? styles.statusTaken : styles.statusPending,
              ]}>
                {s.taken ? 'TAKEN' : 'PENDING'}
              </Text>
            </View>
            <Text style={styles.medName}>{med?.name || 'Unknown'}</Text>
            <Text style={styles.dose}>{med?.dose}</Text>
            {s.withFood && <Text style={styles.food}>Take with food</Text>}
            {!s.taken && (
              <TouchableOpacity
                style={styles.cardScanBtn}
                onPress={() => handleScan(s.id)}
              >
                <Text style={styles.cardScanBtnText}>Scan Tablet</Text>
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
  scanBtnText: { color: '#2563eb', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTaken: { opacity: 0.6 },
  cardNext: { borderColor: '#2563eb', borderWidth: 2 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
