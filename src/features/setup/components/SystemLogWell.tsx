import { useEffect, useRef } from 'react';
import type { DiagnosticLogEntry } from '../../../types';
import styles from './SystemLogWell.module.css';

interface SystemLogWellProps {
  logs: DiagnosticLogEntry[];
}

export function SystemLogWell({ logs }: SystemLogWellProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getLevelClass = (level: string) => {
    switch (level) {
      case 'info':
        return styles.info;
      case 'success':
        return styles.success;
      case 'warning':
        return styles.warning;
      case 'error':
        return styles.error;
      default:
        return '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Technical Log</span>
      </div>
      <div className={styles.logWell} ref={containerRef}>
        {logs.length === 0 ? (
          <div className={styles.empty}>No diagnostic logs yet</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`${styles.entry} ${getLevelClass(log.level)}`}>
              <span className={styles.timestamp}>[{formatTimestamp(log.timestamp)}]</span>
              <span className={styles.level}>[{log.level.toUpperCase()}]</span>
              <span className={styles.message}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
