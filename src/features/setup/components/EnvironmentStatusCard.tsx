import { Card, CardHeader, CardContent } from '../../../components/ui/Card';
import type { DaemonStatus } from '../../../types';
import styles from './EnvironmentStatusCard.module.css';

interface EnvironmentStatusCardProps {
  adbPath: string | null;
  daemonStatus: DaemonStatus;
  permissions: string;
}

export function EnvironmentStatusCard({
  adbPath,
  daemonStatus,
  permissions,
}: EnvironmentStatusCardProps) {
  const getDaemonStatusDisplay = () => {
    switch (daemonStatus) {
      case 'Running':
        return { text: 'Running', className: styles.success };
      case 'Starting':
        return { text: 'Starting...', className: styles.warning };
      case 'Stopped':
        return { text: 'Stopped', className: styles.error };
      case 'Error':
        return { text: 'Error', className: styles.error };
      default:
        return { text: 'Unknown', className: styles.unknown };
    }
  };

  const daemonDisplay = getDaemonStatusDisplay();

  return (
    <Card variant="elevated" className={styles.card}>
      <CardHeader>
        <h3 className={styles.title}>Diagnostics Feed</h3>
      </CardHeader>
      <CardContent>
        <div className={styles.items}>
          <div className={styles.item}>
            <span className={styles.label}>Local Bridge Path</span>
            <span className={styles.value}>
              {adbPath || <span className={styles.missing}>Not detected</span>}
            </span>
          </div>

          <div className={styles.divider} />

          <div className={styles.item}>
            <span className={styles.label}>Daemon Status</span>
            <span className={`${styles.statusBadge} ${daemonDisplay.className}`}>
              <span className={styles.statusDot} />
              {daemonDisplay.text}
            </span>
          </div>

          <div className={styles.divider} />

          <div className={styles.item}>
            <span className={styles.label}>Permissions</span>
            <span className={`${styles.statusBadge} ${styles.success}`}>
              <span className={styles.statusDot} />
              {permissions}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
