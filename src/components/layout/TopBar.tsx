import { useDeviceStore, useAppStore } from '../../stores';
import styles from './TopBar.module.css';

export function TopBar() {
  const { activeScreen } = useAppStore();
  const { devices, activeDeviceId } = useDeviceStore();

  const activeDevice = activeDeviceId ? devices[activeDeviceId] : null;
  const connectionStatus = activeDevice?.connectionStatus || 'disconnected';

  const screenTitles: Record<string, string> = {
    setup: 'Setup Wizard',
    dashboard: 'Main Dashboard',
    logs: 'Logs',
    settings: 'Settings',
  };

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <span className={`${styles.badge} ${styles.connected}`}>Connected</span>;
      case 'connecting':
        return <span className={`${styles.badge} ${styles.connecting}`}>Connecting...</span>;
      case 'error':
        return (
          <span className={`${styles.badge} ${styles.error}`} title={activeDevice?.lastError || 'Connection error'}>
            Error {!activeDevice?.lastError?.includes(' ') && activeDevice?.lastError ? `: ${activeDevice.lastError}` : ''}
          </span>
        );
      default:
        return <span className={`${styles.badge} ${styles.disconnected}`}>Disconnected</span>;
    }
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <h1 className={styles.title}>{screenTitles[activeScreen]}</h1>
      </div>
      <div className={styles.right}>
        {activeScreen === 'dashboard' && getConnectionBadge()}
        <div className={styles.brand}>ADB COMMAND DECK</div>
      </div>
    </header>
  );
}
