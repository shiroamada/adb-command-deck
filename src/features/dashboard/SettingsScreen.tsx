import { useAppStore } from '../../stores';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import styles from './SettingsScreen.module.css';

export function SettingsScreen() {
  const { theme, setTheme, consoleTheme, setConsoleTheme } = useAppStore();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      <Card variant="elevated" className={styles.card}>
        <CardHeader>
          <h3 className={styles.sectionTitle}>Appearance</h3>
        </CardHeader>
        <CardContent>
          <div className={styles.setting}>
            <span className={styles.label}>Theme</span>
            <div className={styles.themeButtons}>
              <button
                className={`${styles.themeBtn} ${theme === 'dark' ? styles.active : ''}`}
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
              <button
                className={`${styles.themeBtn} ${theme === 'light' ? styles.active : ''}`}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
              <button
                className={`${styles.themeBtn} ${theme === 'system' ? styles.active : ''}`}
                onClick={() => setTheme('system')}
              >
                System
              </button>
            </div>
          </div>

          <div className={styles.setting}>
            <span className={styles.label}>Console Theme</span>
            <div className={styles.themeButtons}>
              <button
                className={`${styles.themeBtn} ${consoleTheme === 'dark' ? styles.active : ''}`}
                onClick={() => setConsoleTheme('dark')}
              >
                Dark
              </button>
              <button
                className={`${styles.themeBtn} ${consoleTheme === 'light' ? styles.active : ''}`}
                onClick={() => setConsoleTheme('light')}
              >
                Light
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="elevated" className={styles.card}>
        <CardHeader>
          <h3 className={styles.sectionTitle}>About</h3>
        </CardHeader>
        <CardContent>
          <div className={styles.about}>
            <p className={styles.appName}>ADB Command Deck</p>
            <p className={styles.version}>Version 0.1.0</p>
            <p className={styles.description}>
              A fast desktop control surface for Android Debug Bridge operations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
