import { create } from 'zustand';
import type { AdbInfo, DaemonStatus, DiagnosticLogEntry } from '../types';

type ValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid';

interface SetupState {
  adbPath: string | null;
  adbVersion: string | null;
  daemonStatus: DaemonStatus;
  validationStatus: ValidationStatus;
  diagnosticLogs: DiagnosticLogEntry[];
  customAdbPath: string | null;
  isChecking: boolean;

  setAdbInfo: (info: AdbInfo | null) => void;
  setDaemonStatus: (status: DaemonStatus) => void;
  setValidationStatus: (status: ValidationStatus) => void;
  setCustomAdbPath: (path: string | null) => void;
  setIsChecking: (checking: boolean) => void;
  appendLog: (entry: Omit<DiagnosticLogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  reset: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useSetupStore = create<SetupState>((set) => ({
  adbPath: null,
  adbVersion: null,
  daemonStatus: 'unknown',
  validationStatus: 'idle',
  diagnosticLogs: [],
  customAdbPath: null,
  isChecking: false,

  setAdbInfo: (info) =>
    set({
      adbPath: info?.path ?? null,
      adbVersion: info?.version ?? null,
    }),

  setDaemonStatus: (status) => set({ daemonStatus: status }),

  setValidationStatus: (status) => set({ validationStatus: status }),

  setCustomAdbPath: (path) => set({ customAdbPath: path }),

  setIsChecking: (checking) => set({ isChecking: checking }),

  appendLog: (entry) =>
    set((state) => ({
      diagnosticLogs: [
        ...state.diagnosticLogs,
        {
          ...entry,
          id: generateId(),
          timestamp: new Date(),
        },
      ],
    })),

  clearLogs: () => set({ diagnosticLogs: [] }),

  reset: () =>
    set({
      adbPath: null,
      adbVersion: null,
      daemonStatus: 'unknown',
      validationStatus: 'idle',
      diagnosticLogs: [],
      customAdbPath: null,
      isChecking: false,
    }),
}));
