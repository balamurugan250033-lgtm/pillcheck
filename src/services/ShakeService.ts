import { AppState, AppStateStatus } from 'react-native';
import { accelerometer, setUpdateIntervalForType } from 'react-native-sensors';

let lastShakeTime = 0;
const SHAKE_COOLDOWN = 1000;
const SHAKE_THRESHOLD = 2.5;
let shakeHandler: (() => void) | null = null;
let subscription: any = null;

export class ShakeService {
  static start(onShake: () => void) {
    shakeHandler = onShake;
    setUpdateIntervalForType(accelerometer, 100);
    subscription = accelerometer.subscribe(({ x, y, z }: { x: number; y: number; z: number }) => {
      const total = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (total > SHAKE_THRESHOLD && now - lastShakeTime > SHAKE_COOLDOWN) {
        lastShakeTime = now;
        shakeHandler?.();
      }
    });
  }

  static stop() {
    subscription?.unsubscribe();
    subscription = null;
    shakeHandler = null;
  }
}
