import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useSetupStore } from '../stores';
import type { AdbInfo, CommandResult } from '../types';
import styles from './SplashScreen.module.css';

const ADB_DOWNLOAD_URL = 'https://developer.android.com/studio/releases/platform-tools';

interface SplashScreenProps {
  onComplete: (success: boolean) => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const { setAdbInfo, setValidationStatus } = useSetupStore();

  useEffect(() => {
    const init = async () => {
      try {
        setStatus('Detecting ADB...');

        const detectResult = await invoke<CommandResult<AdbInfo>>('detect_adb');

        if (detectResult.success && detectResult.data) {
          setAdbInfo(detectResult.data);
          setStatus('Checking daemon...');

          const daemonResult = await invoke<CommandResult<string>>('check_daemon_status');

          if (daemonResult.success) {
            setStatus('Ready!');
            // Small delay to show "Ready!" state
            await new Promise((resolve) => setTimeout(resolve, 300));
            onComplete(true);
          } else {
            setError('Failed to check ADB daemon status');
            onComplete(false);
          }
        } else {
          setError(detectResult.error || 'ADB not found');
          onComplete(false);
        }
      } catch (err) {
        setError(String(err));
        onComplete(false);
      }
    };

    init();
  }, [setAdbInfo, setValidationStatus, onComplete]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logo}>◈</div>
        <h1 className={styles.title}>ADB Command Deck</h1>
        <p className={styles.subtitle}>Initializing...</p>

        <div className={styles.statusContainer}>
          <div className={styles.spinner} />
          <p className={styles.status}>{status}</p>
        </div>

        {error && (
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error}</p>
            <button
              className={styles.downloadBtn}
              onClick={() => openUrl(ADB_DOWNLOAD_URL)}
            >
              Download ADB
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
