import { useDeviceStore, useSetupStore } from '../../stores';
import styles from './Footer.module.css';

export function Footer() {
  const { devices, activeDeviceId } = useDeviceStore();
  const { daemonStatus } = useSetupStore();

  const activeDevice = activeDeviceId ? devices[activeDeviceId] : null;

  const getAdbStatusClass = () => {
    switch (daemonStatus) {
      case 'Running':
        return styles.online;
      case 'Starting':
        return styles.starting;
      default:
        return styles.offline;
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <div className={styles.adbStatus}>
          <span className={`${styles.statusDot} ${getAdbStatusClass()}`} />
          <span className={styles.label}>ADB:</span>
          <span className={styles.value}>
            {daemonStatus === 'Running' ? 'ONLINE' : daemonStatus.toUpperCase()}
          </span>
        </div>

        {activeDevice?.connectedDevice && activeDevice.connectionStatus === 'connected' && (
          <div className={styles.deviceInfo}>
            <span className={styles.label}>Device:</span>
            <span className={styles.value}>{activeDevice.connectedDevice}</span>
          </div>
        )}
      </div>

      <div className={styles.right}>
        <a href="#" className={styles.link}>Documentation</a>
        <span className={styles.separator}>|</span>
        <a href="#" className={styles.link}>Issue Tracker</a>
      </div>
    </footer>
  );
}
