import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../../../components/ui/Button';
import { useDeviceStore, useDeviceConsole } from '../../../stores';
import type { CommandResult } from '../../../types';
import styles from './ApkInstallDialog.module.css';

interface ApkInstallDialogProps {
  apkPath: string;
  apkName: string;
  onClose: () => void;
}

export function ApkInstallDialog({ apkPath, apkName, onClose }: ApkInstallDialogProps) {
  const { devices, activeDeviceId } = useDeviceStore();
  const { addLine } = useDeviceConsole(activeDeviceId);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDevice = activeDeviceId ? devices[activeDeviceId] : null;
  const targetDevice = activeDevice?.connectedDevice || activeDevice?.targetIp;

  const handleInstall = async () => {
    if (!activeDeviceId || !activeDevice?.connectedDevice) {
      setError('No device connected');
      return;
    }

    setIsInstalling(true);
    setError(null);

    try {
      addLine({
        level: 'system',
        content: `Installing APK: ${apkName}`,
      });

      const result = await invoke<CommandResult<string>>('install_apk', {
        deviceId: activeDevice.connectedDevice,
        apkPath,
      });

      if (result.success) {
        addLine({
          level: 'success',
          content: `APK installed successfully`,
        });
        onClose();
      } else {
        setError(result.error || 'Installation failed');
        addLine({
          level: 'error',
          content: `APK install failed: ${result.error}`,
        });
      }
    } catch (err) {
      setError(String(err));
      addLine({
        level: 'error',
        content: `Error: ${err}`,
      });
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Install APK</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.fileInfo}>
            <span className={styles.label}>APK File</span>
            <span className={styles.fileName}>{apkName}</span>
          </div>

          <div className={styles.fileInfo}>
            <span className={styles.label}>Target Device</span>
            <span className={styles.deviceName}>
              {targetDevice || 'No device selected'}
            </span>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose} disabled={isInstalling}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleInstall}
            loading={isInstalling}
            disabled={!activeDevice?.connectedDevice}
          >
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}
