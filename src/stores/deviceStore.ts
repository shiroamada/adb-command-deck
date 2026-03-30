import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConnectionStatus, DeviceMetrics } from '../types';

export interface DeviceSession {
  id: string;
  targetIp: string;
  targetPort: string;
  packageName: string | null;
  activityName: string | null;
  connectionStatus: ConnectionStatus;
  connectedDevice: string | null;
  sessionMetrics: DeviceMetrics;
  lastError: string | null;
  customName: string | null;
}

interface DeviceState {
  devices: Record<string, DeviceSession>;
  activeDeviceId: string | null;

  // Device CRUD
  addDevice: () => string;
  removeDevice: (id: string) => void;
  setActiveDeviceId: (id: string) => void;

  // Per-device setters
  setTargetIp: (id: string, ip: string) => void;
  setTargetPort: (id: string, port: string) => void;
  setPackageName: (id: string, pkg: string | null) => void;
  setActivityName: (id: string, activity: string | null) => void;
  setCustomName: (id: string, name: string | null) => void;
  setConnectionStatus: (id: string, status: ConnectionStatus) => void;
  setConnectedDevice: (id: string, device: string | null) => void;
  setSessionMetrics: (id: string, metrics: Partial<DeviceMetrics>) => void;
  setLastError: (id: string, error: string | null) => void;
  resetDevice: (id: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const createDefaultDevice = (id: string): DeviceSession => ({
  id,
  targetIp: '',
  targetPort: '5555',
  packageName: null,
  activityName: null,
  connectionStatus: 'disconnected',
  connectedDevice: null,
  sessionMetrics: {
    latency_ms: null,
    cpu_percent: null,
    memory_mb: null,
  },
  lastError: null,
  customName: null,
});

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set) => {
      const initialId = generateId();

      return {
        devices: {
          [initialId]: createDefaultDevice(initialId),
        },
        activeDeviceId: initialId,

        addDevice: () => {
          const id = generateId();
          set((state) => ({
            devices: {
              ...state.devices,
              [id]: createDefaultDevice(id),
            },
            activeDeviceId: id,
          }));
          return id;
        },

        removeDevice: (id) => {
          set((state) => {
            const newDevices = { ...state.devices };
            delete newDevices[id];

            let activeDeviceId = state.activeDeviceId;
            if (activeDeviceId === id) {
              const remainingIds = Object.keys(newDevices);
              activeDeviceId = remainingIds.length > 0 ? remainingIds[0] : null;
            }

            return {
              devices: newDevices,
              activeDeviceId,
            };
          });
        },

        setActiveDeviceId: (id) => set({ activeDeviceId: id }),

        setTargetIp: (id, ip) =>
          set((state) => ({
            devices: {
              ...state.devices,
              [id]: { ...state.devices[id], targetIp: ip },
            },
          })),

        setTargetPort: (id, port) =>
          set((state) => ({
            devices: {
              ...state.devices,
              [id]: { ...state.devices[id], targetPort: port },
            },
          })),

        setPackageName: (id, pkg) =>
          set((state) => ({
            devices: {
              ...state.devices,
              [id]: { ...state.devices[id], packageName: pkg },
            },
          })),

        setActivityName: (id, activity) =>
          set((state) => ({
            devices: {
              ...state.devices,
              [id]: { ...state.devices[id], activityName: activity },
            },
          })),

        setCustomName: (id, name) =>
          set((state) => ({
            devices: {
              ...state.devices,
              [id]: { ...state.devices[id], customName: name },
            },
          })),

        setConnectionStatus: (id, status) =>
          set((state) => ({
            devices: {
              ...state.devices,
              [id]: { ...state.devices[id], connectionStatus: status },
            },
          })),

        setConnectedDevice: (id, device) =>
          set((state) => ({
            devices: {
              ...state.devices,
              [id]: { ...state.devices[id], connectedDevice: device },
            },
          })),

        setSessionMetrics: (id, metrics) =>
          set((state) => ({
            devices: {
              ...state.devices,
              [id]: {
                ...state.devices[id],
                sessionMetrics: { ...state.devices[id].sessionMetrics, ...metrics },
              },
            },
          })),

        setLastError: (id, error) =>
          set((state) => ({
            devices: {
              ...state.devices,
              [id]: { ...state.devices[id], lastError: error },
            },
          })),

        resetDevice: (id) =>
          set((state) => ({
            devices: {
              ...state.devices,
              [id]: createDefaultDevice(id),
            },
          })),
      };
    },
    {
      name: 'adb-command-deck-devices',
    }
  )
);
