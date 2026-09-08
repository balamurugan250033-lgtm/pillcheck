import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { useApp } from '../store/context';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
  route: RouteProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const { currentPrescription } = useApp();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>PillCheck</Text>
      <Text style={styles.subtitle}>Voice-guided medication verification</Text>

      <TouchableOpacity
        style={[styles.button, styles.primary]}
        onPress={() => navigation.navigate('PrescriptionCapture')}
      >
        <Text style={styles.buttonText}>📸 Capture Prescription</Text>
      </TouchableOpacity>

      {currentPrescription && (
        <TouchableOpacity
          style={[styles.button, styles.secondary]}
          onPress={() => navigation.navigate('Schedule', { prescriptionId: currentPrescription.id })}
        >
          <Text style={styles.buttonText}>📋 Today's Schedule</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, styles.secondary]}
        onPress={() => navigation.navigate('History')}
      >
        <Text style={styles.buttonText}>📊 History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondary]}
        onPress={() => navigation.navigate('Caregiver')}
      >
        <Text style={styles.buttonText}>👥 Caregiver View</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondary]}
        onPress={() => navigation.navigate('Settings')}
      >
        <Text style={styles.buttonText}>⚙️ Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f7f9fc',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  primary: {
    backgroundColor: '#2563eb',
  },
  secondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
