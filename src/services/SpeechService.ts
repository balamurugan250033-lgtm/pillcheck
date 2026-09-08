import { AppState, AppStateStatus } from 'react-native';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';

export class SpeechService {
  private initialized = false;

  async init() {
    if (this.initialized) return;
    Tts.setDefaultLanguage('en-US');
    Tts.setDefaultRate(0.45);
    Tts.setDefaultPitch(1.0);
    Voice.onSpeechResults = (e: any) => this.handleResults(e);
    Voice.onSpeechError = (e: any) => this.handleError(e);
    this.initialized = true;
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Tts.speak(text);
      const finishHandler = () => resolve();
      const errorHandler = (event: any) => reject(event);
      (Tts as any).events.addListener('tts-finish', finishHandler);
      (Tts as any).events.addListener('tts-error', errorHandler);
    });
  }

  stop() {
    Tts.stop();
    Voice.stop();
  }

  startListening(
    onResult: (text: string) => void,
    onError?: (err: string) => void
  ) {
    Voice.start('en-US');
    this.currentOnResult = onResult;
    this.currentOnError = onError;
  }

  stopListening() {
    Voice.stop();
  }

  private currentOnResult?: (text: string) => void;
  private currentOnError?: (err: string) => void;

  private handleResults(e: any) {
    const text = (e.value || [])[0];
    if (text && this.currentOnResult) {
      this.currentOnResult(text.toLowerCase().trim());
    }
  }

  private handleError(e: any) {
    if (this.currentOnError && e.error) {
      this.currentOnError(e.error.message || 'Speech error');
    }
  }

  destroy() {
    Voice.destroy().catch(() => {});
    Tts.stop();
  }
}
