import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { SpeechService } from '../services/SpeechService';
import { HapticService } from '../services/HapticService';
import { useApp } from '../store/context';
import { computeVerdict, fuzzyMatchScore } from '../services/MatchingService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TabletScan'>;
  route: RouteProp<RootStackParamList, 'TabletScan'>;
};

export default function TabletScanScreen({ navigation, route }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<any>(null);
  const speech = new SpeechService();
  const { currentPrescription, addScanResult } = useApp();
  const { scheduleId } = route.params;

  useEffect(() => {
    (async () => {
      const { status } = await RNCamera.requestCameraPermission();
      setHasPermission(status === 'authorized');
      await speech.init();
    })();
    return () => speech.destroy();
  }, []);

  const handleScan = async () => {
    if (!cameraRef.current || !currentPrescription) return;
    try {
      const photo = await (cameraRef.current as any).takePictureAsync({ quality: 0.5, base64: false });
      const schedule = currentPrescription.medications
        .flatMap(m => m.schedule)
        .find(s => s.id === scheduleId);
      const med = currentPrescription.medications.find(m => m.schedule.some(s => s.id === scheduleId));

      if (!schedule || !med) return;

      const detected = {
        shape: 'round',
        color: 'white',
        imprint: 'ABC',
      };

      const expected = {
        shape: med.shape,
        color: med.color,
        imprint: med.imprint,
      };

      const score = fuzzyMatchScore(expected, detected);
      const verdict = computeVerdict(expected, detected);

      const scanResult = {
        id: `scan_${Date.now()}`,
        prescriptionId: currentPrescription.id,
        medicationId: med.id,
        scheduleId,
        timestamp: Date.now(),
        match: verdict,
        confidence: score,
        detectedFeatures: detected,
        expectedFeatures: expected,
        userResponse: 'confirm' as const,
      };

      await addScanResult(scanResult);
      HapticService.trigger(verdict === 'match' ? 'match' : 'mismatch');
      navigation.replace('Verdict', { scanResultId: scanResult.id });
    } catch (e) {
      Alert.alert('Scan Failed', 'Please try again');
    }
  };

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Camera permission required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasPermission === true && (
        <>
          <RNCamera ref={cameraRef} style={styles.camera} type={RNCamera.Constants.Type.back} />
          <View style={styles.overlay}>
            <Text style={styles.instruction}>Place tablet on plain surface and scan</Text>
            <TouchableOpacity style={styles.scanBtn} onPress={handleScan}>
              <View style={styles.scanInner} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
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
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scanBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ef4444' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  message: { color: '#fff', fontSize: 16, textAlign: 'center', margin: 20 },
});
