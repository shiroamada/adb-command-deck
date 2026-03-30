import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useSetupStore } from '../../stores';
import { Button } from '../../components/ui/Button';
import { EnvironmentStatusCard } from './components/EnvironmentStatusCard';
import { ValidationProgress } from './components/ValidationProgress';
import { SystemLogWell } from './components/SystemLogWell';
import { ManualPathModal } from './components/ManualPathModal';
import type { AdbInfo, DaemonStatus, CommandResult } from '../../types';
import styles from './SetupWizardScreen.module.css';

const ADB_DOWNLOAD_URL = 'https://developer.android.com/studio/releases/platform-tools';

export function SetupWizardScreen() {
  const {
    adbPath,
    daemonStatus,
    validationStatus,
    diagnosticLogs,
    isChecking,
    setAdbInfo,
    setDaemonStatus,
    setValidationStatus,
    setIsChecking,
    appendLog,
    clearLogs,
  } = useSetupStore();

  const runDiagnostics = async () => {
    clearLogs();
    setIsChecking(true);
    setValidationStatus('checking');

    try {
      appendLog({
        level: 'info',
        message: 'Initializing system bridge...',
      });

      // Detect ADB
      appendLog({
        level: 'info',
        message: 'Searching for ADB binary...',
      });

      const detectResult = await invoke<CommandResult<AdbInfo>>('detect_adb');

      if (detectResult.success && detectResult.data) {
        setAdbInfo(detectResult.data);
        appendLog({
          level: 'success',
          message: `Found: ${detectResult.data.path}`,
        });
        appendLog({
          level: 'success',
          message: `Version: ${detectResult.data.version}`,
        });
      } else {
        appendLog({
          level: 'error',
          message: `CRITICAL: ${detectResult.error || 'ADB not found'}`,
        });
        appendLog({
          level: 'error',
          message: `Download Android SDK Platform Tools: ${ADB_DOWNLOAD_URL}`,
        });
        setValidationStatus('invalid');
        setIsChecking(false);
        return;
      }

      // Check daemon status
      appendLog({
        level: 'info',
        message: 'Checking daemon status...',
      });

      const daemonResult = await invoke<CommandResult<DaemonStatus>>('check_daemon_status');

      if (daemonResult.success && daemonResult.data) {
        const status = daemonResult.data;
        if (status === 'Running') {
          setDaemonStatus('Running');
          appendLog({
            level: 'success',
            message: 'Daemon is running',
          });
        } else if (status === 'Starting') {
          setDaemonStatus('Starting');
          appendLog({
            level: 'info',
            message: 'Daemon is starting...',
          });
        } else if (status === 'Stopped') {
          setDaemonStatus('Stopped');
          appendLog({
            level: 'warning',
            message: 'Daemon is not running',
          });
        } else {
          setDaemonStatus('Error');
          appendLog({
            level: 'error',
            message: 'Daemon status error',
          });
        }
      } else {
        setDaemonStatus('Error');
        appendLog({
          level: 'error',
          message: `Daemon check failed: ${daemonResult.error || 'Unknown error'}`,
        });
      }

      setValidationStatus('valid');
      appendLog({
        level: 'success',
        message: 'Environment validation complete',
      });
    } catch (err) {
      appendLog({
        level: 'error',
        message: `Unexpected error: ${err}`,
      });
      setValidationStatus('invalid');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Auto-run diagnostics on mount
    runDiagnostics();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.badge}>System Initialization</span>
        <h1 className={styles.title}>ENVIRONMENT VALIDATOR</h1>
        <p className={styles.subtitle}>
          Validate your development environment and ensure ADB is properly configured
          before connecting to devices.
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.leftColumn}>
          <EnvironmentStatusCard
            adbPath={adbPath}
            daemonStatus={daemonStatus}
            permissions="Granted"
          />
        </div>

        <div className={styles.rightColumn}>
          <ValidationProgress
            status={validationStatus}
            isChecking={isChecking}
          />

          <div className={styles.actions}>
            <Button
              variant="primary"
              size="lg"
              onClick={runDiagnostics}
              loading={isChecking}
            >
              Run Diagnostic
            </Button>
            <ManualPathModal />
            {validationStatus === 'invalid' && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => openUrl(ADB_DOWNLOAD_URL)}
              >
                Download ADB
              </Button>
            )}
          </div>

          <SystemLogWell logs={diagnosticLogs} />
        </div>
      </div>
    </div>
  );
}
