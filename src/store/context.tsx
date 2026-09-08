import { useContext, createContext, useState, ReactNode, useCallback } from 'react';
import { Prescription, ScanResult, AppSettings, Medication } from '../types';
import { storage } from '../services/StorageService';

interface AppContextType {
  currentPrescription: Prescription | null;
  setCurrentPrescription: (p: Prescription | null) => void;
  scanResults: ScanResult[];
  addScanResult: (r: ScanResult) => Promise<void>;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  refreshScanResults: () => Promise<void>;
}

export const AppContext = createContext<AppContextType>({
  currentPrescription: null,
  setCurrentPrescription: () => {},
  scanResults: [],
  addScanResult: async () => {},
  settings: {
    largePrint: false,
    oneHandMode: false,
    vibrationEnabled: true,
    screenFlashEnabled: true,
    shakeToSnooze: true,
  },
  updateSettings: () => {},
  refreshScanResults: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentPrescription, setCurrentPrescription] = useState<Prescription | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    largePrint: false,
    oneHandMode: false,
    vibrationEnabled: true,
    screenFlashEnabled: true,
    shakeToSnooze: true,
  });

  const addScanResult = useCallback(async (result: ScanResult) => {
    await storage.saveScanResult(result);
    setScanResults(prev => [result, ...prev]);
  }, []);

  const refreshScanResults = useCallback(async () => {
    const results = await storage.getTodaysScanResults();
    setScanResults(results);
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentPrescription,
        setCurrentPrescription,
        scanResults,
        addScanResult,
        settings,
        updateSettings,
        refreshScanResults,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
