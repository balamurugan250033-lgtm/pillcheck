export interface Prescription {
  id: string;
  createdAt: number;
  rawText?: string;
  medications: Medication[];
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  shape?: string;
  color?: string;
  imprint?: string;
  schedule: ScheduleEntry[];
  imageUri?: string;
}

export interface ScheduleEntry {
  id: string;
  time: string;
  withFood?: boolean;
  taken: boolean;
  takenAt?: number;
  status: 'pending' | 'taken' | 'skipped' | 'mismatch';
  mismatchDetails?: string;
}

export interface ScanResult {
  id: string;
  prescriptionId: string;
  medicationId: string;
  scheduleId: string;
  timestamp: number;
  match: 'match' | 'mismatch' | 'uncertain';
  confidence?: number;
  detectedFeatures?: {
    shape?: string;
    color?: string;
    imprint?: string;
  };
  expectedFeatures?: {
    shape?: string;
    color?: string;
    imprint?: string;
  };
  userResponse: 'confirm' | 'skip' | 'remind_later' | 'ask_alternative';
}

export interface AppSettings {
  largePrint: boolean;
  oneHandMode: boolean;
  vibrationEnabled: boolean;
  screenFlashEnabled: boolean;
  shakeToSnooze: boolean;
  caregiverLink?: string;
}

export type RootStackParamList = {
  Home: undefined;
  PrescriptionCapture: undefined;
  Schedule: { prescriptionId: string };
  TabletScan: { prescriptionId: string; scheduleId: string };
  Verdict: { scanResultId: string };
  History: undefined;
  Caregiver: undefined;
  Settings: undefined;
};
