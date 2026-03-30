import styles from './ValidationProgress.module.css';

interface ValidationProgressProps {
  status: 'idle' | 'checking' | 'valid' | 'invalid';
  isChecking: boolean;
}

export function ValidationProgress({ status, isChecking }: ValidationProgressProps) {
  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Ready to scan';
      case 'checking':
        return 'Scanning...';
      case 'valid':
        return 'Validation passed';
      case 'invalid':
        return 'Validation failed';
      default:
        return 'Ready to scan';
    }
  };

  const getProgressClass = () => {
    switch (status) {
      case 'valid':
        return styles.success;
      case 'invalid':
        return styles.error;
      default:
        return '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.circle} ${getProgressClass()}`}>
        <div className={styles.inner}>
          {isChecking && <div className={styles.spinner} />}
          {!isChecking && <span className={styles.icon}>{status === 'valid' ? '✓' : '◎'}</span>}
        </div>
      </div>
      <span className={styles.label}>ADB Check</span>
      <span className={styles.status}>{getStatusText()}</span>
    </div>
  );
}
