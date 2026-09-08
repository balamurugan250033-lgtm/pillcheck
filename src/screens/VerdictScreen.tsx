import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { SpeechService } from '../services/SpeechService';
import { HapticService } from '../services/HapticService';
import { useApp } from '../store/context';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Verdict'>;
  route: RouteProp<RootStackParamList, 'Verdict'>;
};

export default function VerdictScreen({ navigation }: Props) {
  const { scanResults, currentPrescription } = useApp();
  const [flashing, setFlashing] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const speech = useMemo(() => new SpeechService(), []);
  const result = scanResults[0];

  const speakWithFlash = useCallback(async (text: string, type: 'match' | 'mismatch' | 'error') => {
    HapticService.trigger(type);
    if (type === 'match') {
      setFlashing(true);
    }
    await speech.speak(text);
    setFlashing(false);
  }, [speech]);

  useEffect(() => {
    speech.init();
    let mounted = true;
    const runEffect = async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      if (!mounted) {
        return;
      }
      if (result) {
        const med = currentPrescription?.medications.find(m => m.id === result.medicationId);
        if (result.match === 'match') {
          await speakWithFlash('This matches your scheduled tablet.', 'match');
        } else if (result.match === 'mismatch') {
          const expectedColor = med?.color || 'unknown';
          const expectedShape = med?.shape || 'unknown';
          await speakWithFlash(`This doesn't look right. Your tablet should be ${expectedColor} and ${expectedShape}.`, 'mismatch');
        } else {
          await speakWithFlash('I am not certain. Please try scanning again.', 'error');
        }
      }
    };
    runEffect();
    return () => {
      mounted = false;
      speech.destroy();
    };
  }, [result, currentPrescription, speakWithFlash, speech]);

  const confirm = useCallback(async () => {
    await speech.speak('Confirmed. Taking this tablet.');
    navigation.navigate('Home');
  }, [navigation, speech]);

  const skip = useCallback(async () => {
    await speech.speak('Skipped this dose.');
    navigation.navigate('Home');
  }, [navigation, speech]);

  const remindLater = useCallback(async () => {
    await speech.speak('I will remind you in five minutes.');
    navigation.navigate('Home');
  }, [navigation, speech]);

  const askAlternative = useCallback(async () => {
    const med = currentPrescription?.medications.find(m => m.id === result?.medicationId);
    const alt = currentPrescription?.medications.find(m => m.id !== result?.medicationId);
    await speech.speak(`Try your ${med?.name || 'scheduled tablet'} instead. ${alt ? `Your other tablet is ${alt.name}.` : ''}`);
  }, [currentPrescription, result, speech]);

  const handleVoiceCommand = useCallback(async (text: string) => {
    if (text.includes('confirm')) {
      await confirm();
    } else if (text.includes('skip')) {
      await skip();
    } else if (text.includes('later') || text.includes('remind')) {
      await remindLater();
    } else if (text.includes('instead') || text.includes('alternative')) {
      await askAlternative();
    } else {
      await speech.speak('I did not understand. Please use a button below.');
    }
  }, [confirm, skip, remindLater, askAlternative, speech]);

  const startListening = async () => {
    setListening(true);
    setTranscript('');
    speech.startListening(
      async (text: string) => {
        setTranscript(text);
        await handleVoiceCommand(text);
        setListening(false);
      },
      (err: string) => {
        setTranscript(err);
        setListening(false);
      },
    );
  };

  return (
    <View style={[styles.container, flashing && styles.flash]}>
      <Text style={styles.title}>Verdict</Text>
      <Text style={styles.verdict}>{result?.match?.toUpperCase() || 'UNKNOWN'}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={confirm}>
          <Text style={styles.actionText}>Confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.skipBtn]} onPress={skip}>
          <Text style={styles.actionText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.laterBtn]} onPress={remindLater}>
          <Text style={styles.actionText}>Remind Later</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.altBtn]} onPress={askAlternative}>
          <Text style={styles.actionText}>What Instead</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.voiceBtn, listening && styles.voiceBtnActive]}
        onPress={listening ? () => speech.stopListening() : startListening}
      >
        <Text style={styles.voiceBtnText}>{listening ? 'Listening...' : '🎤 Voice Command'}</Text>
      </TouchableOpacity>
      {transcript ? <Text style={styles.transcript}>Heard: {transcript}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f7f9fc' },
  flash: { backgroundColor: '#86efac' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12, color: '#0f172a' },
  verdict: { fontSize: 48, fontWeight: '800', color: '#2563eb', marginBottom: 32 },
  actions: { width: '100%', gap: 12 },
  actionBtn: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipBtn: { backgroundColor: '#64748b' },
  laterBtn: { backgroundColor: '#f59e0b' },
  altBtn: { backgroundColor: '#8b5cf6' },
  actionText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  voiceBtn: {
    marginTop: 24,
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  voiceBtnActive: { backgroundColor: '#ef4444' },
  voiceBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  transcript: { marginTop: 12, color: '#475569', fontSize: 14 },
});
