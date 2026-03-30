import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DeviceTabBar } from './components/DeviceTabBar';
import { DeviceConfigCard } from './components/DeviceConfigCard';
import { QuickActionsGrid } from './components/QuickActionsGrid';
import { ConsolePanel } from './components/ConsolePanel';
import { ApkDropZone } from './components/ApkDropZone';
import { useDeviceStore } from '../../stores';
import type { CommandResult } from '../../types';
import styles from './DashboardScreen.module.css';

export function DashboardScreen() {
  const { devices, setConnectionStatus, setConnectedDevice } = useDeviceStore();

  // Check actual device connection status when dashboard mounts
  useEffect(() => {
    const checkConnections = async () => {
      for (const device of Object.values(devices)) {
        if (device.connectionStatus === 'connected' && device.connectedDevice) {
          try {
            const result = await invoke<CommandResult<boolean>>('check_device_connection', {
              deviceId: device.connectedDevice,
            });

            if (!result.success || !result.data) {
              // Device is actually disconnected
              setConnectionStatus(device.id, 'disconnected');
              setConnectedDevice(device.id, null);
            }
          } catch {
            // Error means device is not reachable
            setConnectionStatus(device.id, 'disconnected');
            setConnectedDevice(device.id, null);
          }
        }
      }
    };

    checkConnections();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <DeviceConfigCard />
        <QuickActionsGrid />
      </div>
      <div className={styles.rightPanel}>
        <DeviceTabBar />
        <ApkDropZone />
        <ConsolePanel />
      </div>
    </div>
  );
}
