import { ConsolePanel } from './components/ConsolePanel';
import styles from './LogsScreen.module.css';

export function LogsScreen() {
  return (
    <div className={styles.container}>
      <ConsolePanel />
    </div>
  );
}
