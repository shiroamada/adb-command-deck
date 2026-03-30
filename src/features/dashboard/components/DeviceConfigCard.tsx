import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useDeviceStore, useDeviceConsole } from '../../../stores';
import type { CommandResult } from '../../../types';
import styles from './DeviceConfigCard.module.css';

export function DeviceConfigCard() {
  const {
    devices,
    activeDeviceId,
    setTargetIp,
    setTargetPort,
    setPackageName,
    setActivityName,
    setConnectionStatus,
    setConnectedDevice,
    setLastError,
  } = useDeviceStore();

  const { addLine } = useDeviceConsole(activeDeviceId);

  const [showActivity, setShowActivity] = useState(false);

  const activeDevice = activeDeviceId ? devices[activeDeviceId] : null;

  if (!activeDevice) {
    return (
      <Card variant="elevated" className={styles.card}>
        <CardHeader>
          <h3 className={styles.title}>Device Configuration</h3>
        </CardHeader>
        <CardContent>
          <p className={styles.noDevice}>No device selected</p>
        </CardContent>
      </Card>
    );
  }

  const {
    id,
    targetIp,
    targetPort,
    packageName,
    activityName,
    connectionStatus,
  } = activeDevice;

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  const handleConnect = async () => {
    if (!targetIp) {
      setLastError(id, 'Please enter a device IP address');
      setConnectionStatus(id, 'error');
      addLine({ level: 'error', content: 'Please enter a device IP address' });
      return;
    }

    setConnectionStatus(id, 'connecting');
    setLastError(id, null);

    const deviceId = `${targetIp}:${targetPort}`;

    try {
      // First check if device is already connected via ADB
      const checkResult = await invoke<CommandResult<boolean>>('check_device_connection', {
        deviceId,
      });

      if (checkResult.success && checkResult.data === true) {
        // Device is already connected, just update UI state
        setConnectionStatus(id, 'connected');
        setConnectedDevice(id, deviceId);
        return;
      }

      // Device not connected, try to connect
      const result = await invoke<CommandResult<void>>('connect_device', {
        ip: targetIp,
        port: parseInt(targetPort, 10),
      });

      if (result.success) {
        setConnectionStatus(id, 'connected');
        setConnectedDevice(id, deviceId);
      } else {
        const errorMsg = result.error || 'Connection failed';
        setConnectionStatus(id, 'error');
        setLastError(id, errorMsg);
        addLine({ level: 'error', content: `Connection failed: ${errorMsg}` });
      }
    } catch (err) {
      const errorMsg = String(err);
      setConnectionStatus(id, 'error');
      setLastError(id, errorMsg);
      addLine({ level: 'error', content: `Connection error: ${errorMsg}` });
    }
  };

  const handleDisconnect = async () => {
    if (!targetIp) return;

    try {
      const result = await invoke<CommandResult<void>>('disconnect_device', {
        ip: targetIp,
        port: parseInt(targetPort, 10),
      });

      if (result.success) {
        setConnectionStatus(id, 'disconnected');
        setConnectedDevice(id, null);
      } else {
        const errorMsg = result.error || 'Disconnect failed';
        setLastError(id, errorMsg);
        addLine({ level: 'error', content: `Disconnect failed: ${errorMsg}` });
      }
    } catch (err) {
      const errorMsg = String(err);
      setLastError(id, errorMsg);
      addLine({ level: 'error', content: `Disconnect error: ${errorMsg}` });
    }
  };

  return (
    <Card variant="elevated" className={styles.card}>
      <CardHeader>
        <h3 className={styles.title}>Device Configuration</h3>
      </CardHeader>
      <CardContent>
        <div className={styles.form}>
          <div className={styles.row}>
            <div className={styles.ipField}>
              <Input
                label="Device IP Address"
                placeholder="192.168.1.104"
                value={targetIp}
                onChange={(e) => setTargetIp(id, e.target.value)}
                disabled={isConnected || isConnecting}
              />
            </div>
            <div className={styles.portField}>
              <Input
                label="Port"
                placeholder="5555"
                value={targetPort}
                onChange={(e) => setTargetPort(id, e.target.value)}
                disabled={isConnected || isConnecting}
              />
            </div>
          </div>

          <Input
            label="Package Name (optional)"
            placeholder="com.example.app"
            value={packageName || ''}
            onChange={(e) => setPackageName(id, e.target.value || null)}
          />

          {!showActivity ? (
            <button className={styles.showActivityBtn} onClick={() => setShowActivity(true)}>
              + Add Activity Name
            </button>
          ) : (
            <Input
              label="Activity Name (optional)"
              placeholder=".MainActivity"
              value={activityName || ''}
              onChange={(e) => setActivityName(id, e.target.value || null)}
            />
          )}

          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={handleConnect}
              loading={isConnecting}
              disabled={isConnected}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
            <Button
              variant="error"
              onClick={handleDisconnect}
              disabled={!isConnected}
            >
              Disconnect
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
