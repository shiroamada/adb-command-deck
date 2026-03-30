import { useAppStore } from '../../stores';
import type { AppScreen } from '../../types';
import styles from './Sidebar.module.css';

const NAV_ITEMS: { id: AppScreen; label: string; icon: string }[] = [
  { id: 'setup', label: 'Setup Wizard', icon: '⚙' },
  { id: 'dashboard', label: 'Main Dashboard', icon: '◉' },
  { id: 'logs', label: 'Logs', icon: '☰' },
  { id: 'settings', label: 'Settings', icon: '⚡' },
];

export function Sidebar() {
  const { activeScreen, setActiveScreen, sidebarCollapsed, toggleSidebar, isInitializing } = useAppStore();

  return (
    <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>◈</span>
          {!sidebarCollapsed && <span className={styles.brandText}>ADB Deck</span>}
        </div>
        <button className={styles.collapseBtn} onClick={toggleSidebar}>
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`${styles.navItem} ${activeScreen === item.id ? styles.active : ''} ${isInitializing ? styles.disabled : ''}`}
            onClick={() => !isInitializing && setActiveScreen(item.id)}
            title={isInitializing ? 'Initializing, please wait...' : item.label}
            disabled={isInitializing}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {!sidebarCollapsed && <span className={styles.navLabel}>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.status}>
          <span className={styles.statusDot} />
          {!sidebarCollapsed && <span className={styles.statusText}>ADB Bridge Active</span>}
        </div>
      </div>
    </aside>
  );
}
