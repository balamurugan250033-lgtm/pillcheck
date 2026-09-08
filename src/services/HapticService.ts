import { Platform, Vibration, Dimensions } from 'react-native';

export const HAPTIC_PATTERNS = {
  reminder: [100, 50, 100] as number[],
  match: [300] as number[],
  mismatch: [80, 40, 80, 40, 80] as number[],
  error: [200, 100, 200, 100, 200] as number[],
  select: [30] as number[],
} as const;

export class HapticService {
  static trigger(patternName: keyof typeof HAPTIC_PATTERNS) {
    const pattern = HAPTIC_PATTERNS[patternName];
    if (Platform.OS === 'android' && Platform.Version >= 26) {
      Vibration.vibrate(pattern);
    } else if (Platform.OS === 'ios') {
      Vibration.vibrate(pattern[0]);
    }
  }

  static triggerCustom(pattern: number[]) {
    Vibration.vibrate(pattern);
  }

  static cancel() {
    Vibration.cancel();
  }
}
