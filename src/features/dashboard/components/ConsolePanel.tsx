import { useEffect, useRef, useState, useCallback } from 'react';
import AnsiToHtml from 'ansi-to-html';
import { useDeviceStore, useDeviceConsole, useAppStore } from '../../../stores';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import styles from './ConsolePanel.module.css';

const ansiToHtml = new AnsiToHtml({
  fg: '#3fff8b',
  bg: '#000000',
  newline: true,
  escapeXML: true,
  colors: {
    0: '#000000',
    1: '#ff716c',
    2: '#3fff8b',
    3: '#ffb86c',
    4: '#6e9bff',
    5: '#ff79c6',
    6: '#7ae6ff',
    7: '#ffffff',
    8: '#5c5c5c',
    9: '#ff716c',
    10: '#3fff8b',
    11: '#ffb86c',
    12: '#6e9bff',
    13: '#ff79c6',
    14: '#7ae6ff',
    15: '#ffffff',
  },
});

export function ConsolePanel() {
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const [command, setCommand] = useState('');
  const { devices, activeDeviceId } = useDeviceStore();
  const { consoleTheme } = useAppStore();
  const activeDevice = activeDeviceId ? devices[activeDeviceId] : null;
  const connectedDevice = activeDevice?.connectedDevice;
  const { lines, clearLines, addLine } = useDeviceConsole(activeDeviceId);

  const theme = consoleTheme === 'light';

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !connectedDevice) return;

    const cmd = command.trim();
    setCommand('');

    addLine({ level: 'cmd', content: `$ ${cmd}` });

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{ success: boolean; data: string | null; error: string | null }>(
        'execute_command',
        { deviceId: connectedDevice, command: cmd }
      );

      if (result.success && result.data) {
        result.data.split('\n').forEach((line) => {
          if (line.trim()) {
            addLine({ level: 'info', content: line });
          }
        });
      } else {
        addLine({ level: 'error', content: result.error || 'Command failed' });
      }
    } catch (err) {
      addLine({ level: 'error', content: `Error: ${err}` });
    }
  };

  const handleClear = useCallback(() => {
    clearLines();
  }, [clearLines]);

  const handleCopyAll = useCallback(() => {
    const text = lines.map((l) => `[${new Date(l.timestamp).toISOString()}] ${l.content}`).join('\n');
    navigator.clipboard.writeText(text);
  }, [lines]);

  return (
    <Card variant="elevated" className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>Console</span>
        </div>
        <div className={styles.headerRight}>
          <Button variant="ghost" size="sm" onClick={handleCopyAll}>
            Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>
      <div
        className={styles.consoleOutput}
        style={{
          backgroundColor: theme ? '#ffffff' : '#0a0a0a',
          color: theme ? '#008f49' : '#3fff8b',
        }}
      >
        {lines.length === 0 ? (
          <div className={styles.placeholder}>Terminal ready. Connect to a device to begin.</div>
        ) : (
          lines.map((line) => (
            <div key={line.id} className={styles.consoleLine}>
              <span className={styles.timestamp}>
                {new Date(line.timestamp).toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <span className={`${styles.level} ${styles[line.level]}`}>
                {line.level === 'cmd' && '$'}
                {line.level === 'error' && 'ERR'}
                {line.level === 'warning' && 'WARN'}
                {line.level === 'success' && 'OK'}
                {line.level === 'info' && 'INFO'}
                {line.level === 'live' && 'LIVE'}
                {line.level === 'system' && ''}
              </span>
              <span
                className={styles.content}
                dangerouslySetInnerHTML={{
                  __html: ansiToHtml.toHtml(line.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')),
                }}
              />
            </div>
          ))
        )}
        <div ref={consoleEndRef} />
      </div>
      <form className={styles.inputBar} onSubmit={handleCommandSubmit}>
        <span className={styles.prompt}>{connectedDevice ? connectedDevice : '>'}</span>
        <input
          type="text"
          className={styles.commandInput}
          placeholder="Enter command..."
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          disabled={!connectedDevice}
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!connectedDevice || !command.trim()}
        >
          Run
        </Button>
      </form>
    </Card>
  );
}
