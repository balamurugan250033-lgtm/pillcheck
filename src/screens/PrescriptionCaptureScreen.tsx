import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Prescription, Medication, ScheduleEntry } from '../types';
import { storage } from '../services/StorageService';
import { useApp } from '../store/context';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PrescriptionCapture'>;
  route: RouteProp<RootStackParamList, 'PrescriptionCapture'>;
};

export default function PrescriptionCaptureScreen({ navigation }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<any>(null);
  const { setCurrentPrescription } = useApp();

  useEffect(() => {
    (async () => {
      const { status } = await RNCamera.requestCameraPermission();
      setHasPermission(status === 'authorized');
    })();
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: false });
      const prescription = await processPrescriptionPhoto(photo.uri);
      await storage.savePrescription(prescription);
      setCurrentPrescription(prescription);
      navigation.replace('Schedule', { prescriptionId: prescription.id });
    } catch (e) {
      Alert.alert('Error', 'Could not process prescription. Please try again or enter manually.');
    }
  };

  return (
    <View style={styles.container}>
      {hasPermission === null ? (
        <Text style={styles.message}>Requesting camera permission...</Text>
      ) : hasPermission === false ? (
        <View style={styles.center}>
          <Text style={styles.message}>Camera permission is required</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => RNCamera.requestCameraPermission()}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <RNCamera ref={cameraRef} style={styles.camera} type={RNCamera.Constants.Type.back} />
          <View style={styles.overlay}>
            <Text style={styles.instruction}>Position prescription in frame</Text>
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

async function processPrescriptionPhoto(uri: string): Promise<Prescription> {
  const id = `rx_${Date.now()}`;
  const now = Date.now();
  const medications: Medication[] = [
    {
      id: `med_${Date.now()}_1`,
      name: 'Lisinopril',
      dose: '10mg',
      shape: 'oval',
      color: 'white',
      imprint: 'L10',
      schedule: [
        { id: `sched_${Date.now()}_1`, time: '08:00', withFood: false, taken: false, status: 'pending' },
        { id: `sched_${Date.now()}_2`, time: '20:00', withFood: false, taken: false, status: 'pending' },
      ],
      imageUri: uri,
    },
    {
      id: `med_${Date.now()}_2`,
      name: 'Paracetamol',
      dose: '500mg',
      shape: 'round',
      color: 'white',
      imprint: 'M500',
      schedule: [
        { id: `sched_${Date.now()}_3`, time: '08:00', withFood: true, taken: false, status: 'pending' },
        { id: `sched_${Date.now()}_4`, time: '12:00', withFood: true, taken: false, status: 'pending' },
        { id: `sched_${Date.now()}_5`, time: '18:00', withFood: true, taken: false, status: 'pending' },
      ],
      imageUri: uri,
    },
  ];
  return { id, createdAt: now, medications };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instruction: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  message: { color: '#fff', fontSize: 16, textAlign: 'center', margin: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  button: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
});
