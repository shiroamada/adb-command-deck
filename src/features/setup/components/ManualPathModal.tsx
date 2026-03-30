import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useSetupStore } from '../../../stores';
import type { AdbInfo, CommandResult } from '../../../types';
import styles from './ManualPathModal.module.css';

export function ManualPathModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [path, setPath] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { setCustomAdbPath, setAdbInfo, appendLog } = useSetupStore();

  const handleValidate = async () => {
    if (!path.trim()) {
      setError('Please enter a path');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const result = await invoke<CommandResult<AdbInfo>>('validate_adb_path', { path });

      if (result.success && result.data) {
        setCustomAdbPath(path);
        setAdbInfo(result.data);
        appendLog({
          level: 'success',
          message: `Custom path validated: ${result.data.path}`,
        });
        appendLog({
          level: 'success',
          message: `Version: ${result.data.version}`,
        });
        setIsOpen(false);
        setPath('');
      } else {
        setError(result.error || 'Invalid ADB path');
        appendLog({
          level: 'error',
          message: `Manual path validation failed: ${result.error}`,
        });
      }
    } catch (err) {
      setError(`Validation error: ${err}`);
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) {
    return (
      <Button variant="ghost" size="lg" onClick={() => setIsOpen(true)}>
        Manual Path
      </Button>
    );
  }

  return (
    <div className={styles.overlay} onClick={() => setIsOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Manual ADB Path</h3>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
            ×
          </button>
        </div>
        <div className={styles.content}>
          <p className={styles.description}>
            Enter the full path to your ADB executable if it was not automatically detected.
          </p>
          <Input
            placeholder="/usr/local/bin/adb"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            error={error}
            autoFocus
          />
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleValidate} loading={isValidating}>
            Validate
          </Button>
        </div>
      </div>
    </div>
  );
}
