import { useEffect, useRef, useState, useCallback } from 'react';
import AnsiToHtml from 'ansi-to-html';
import { useDeviceStore, useDeviceConsole, useAppStore } from '../../../stores';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import styles from './ConsolePanel.module.css';

const MAX_HISTORY = 7;

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
  const historyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [command, setCommand] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { devices, activeDeviceId } = useDeviceStore();
  const { consoleTheme } = useAppStore();
  const activeDevice = activeDeviceId ? devices[activeDeviceId] : null;
  const connectedDevice = activeDevice?.connectedDevice;
  const targetIp = activeDevice?.targetIp;
  const targetPort = activeDevice?.targetPort;
  const packageName = activeDevice?.packageName;
  const activityName = activeDevice?.activityName;
  const { lines, clearLines, addLine } = useDeviceConsole(activeDeviceId);

  // Command history state
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  const theme = consoleTheme === 'light';

  // Replace placeholders with actual values and prepend adb device target for device commands
  const resolveCommand = useCallback((cmd: string) => {
    // First apply placeholder replacements
    let resolved = cmd
      .replace(/\{\{adb\}\}/g, `adb -s ${connectedDevice}`)
      .replace(/\{\{ip\}\}/g, targetIp || '')
      .replace(/\{\{port\}\}/g, targetPort || '')
      .replace(/\{\{package\}\}/g, packageName || '')
      .replace(/\{\{activity_name\}\}/g, activityName || '');

    // Auto-prepend adb -s <device> if connected and command doesn't already have device targeting
    if (connectedDevice && !resolved.includes(' -s ') && !resolved.includes(' -t ')) {
      // Check if command is an adb command (starts with 'adb') OR just a device command like 'shell', 'pm', etc.
      // Commands that should be routed to device: shell, pm, getprop, am, input, etc.
      const isDeviceCommand = /^\s*(shell|pm|getprop|am|input|svc|logcat|dumpsys|cat|ls|mkdir|rm|mv|cp|chmod|chown)\b/i.test(resolved);
      const startsWithAdb = /^\s*adb\s/.test(resolved);

      if (startsWithAdb) {
        // For adb commands (like "adb shell..."), insert -s <device> after 'adb'
        // But skip for connect/disconnect/kill-server/start-server/devices commands
        const isServerCommand = /^\s*adb\s+(connect|disconnect|kill-server|start-server|devices)\b/i.test(resolved);
        if (!isServerCommand) {
          resolved = resolved.replace(/^\s*(adb\s)/, `$1-s ${connectedDevice} `);
        }
      } else if (isDeviceCommand) {
        // For bare device commands like "shell getprop", prepend "adb -s <device>"
        resolved = `adb -s ${connectedDevice} ${resolved}`;
      }
    }

    return resolved;
  }, [connectedDevice, targetIp, targetPort, packageName, activityName]);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAbort = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('kill_running_command');
      addLine({ level: 'warning', content: 'Command abort requested...' });
    } catch (err) {
      addLine({ level: 'error', content: `Failed to abort: ${err}` });
    }
  };

  const addToHistory = (cmd: string) => {
    setCommandHistory(prev => {
      // Remove duplicates if exists
      const filtered = prev.filter(c => c !== cmd);
      // Add to end, keep max 7
      const newHistory = [...filtered, cmd].slice(-MAX_HISTORY);
      return newHistory;
    });
    setHistoryIndex(-1);
  };

  const deleteFromHistory = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCommandHistory(prev => prev.filter((_, i) => i !== index));
  };

  const selectHistoryItem = (cmd: string) => {
    setCommand(cmd);
    setShowHistory(false);
    setHistoryIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showHistory && commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      } else if (commandHistory.length > 0) {
        setShowHistory(true);
        setHistoryIndex(commandHistory.length - 1);
        setCommand(commandHistory[commandHistory.length - 1]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showHistory && historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Escape') {
      setShowHistory(false);
    } else if (e.key === 'Enter' && showHistory && historyIndex !== -1) {
      e.preventDefault();
      const cmd = commandHistory[historyIndex];
      handleCommandSubmitWithHistory(cmd);
    }
  };

  const handleCommandSubmitWithHistory = (cmdToRun?: string) => {
    const cmd = cmdToRun || command.trim();
    if (!cmd || !connectedDevice) return;

    const rawCmd = cmd;
    const resolvedCmd = resolveCommand(rawCmd);

    addToHistory(rawCmd);
    setCommand('');
    setShowHistory(false);
    setIsRunning(true);

    addLine({ level: 'cmd', content: `$ ${rawCmd}` });

    if (rawCmd !== resolvedCmd) {
      addLine({ level: 'system', content: `Resolved: ${resolvedCmd}` });
    }

    executeCommand(resolvedCmd);
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !connectedDevice) return;
    handleCommandSubmitWithHistory();
  };

  const executeCommand = async (cmd: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{ success: boolean; data: string | null; error: string | null; error_code: string | null }>(
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
        if (result.error_code === 'COMMAND_ABORTED') {
          addLine({ level: 'warning', content: result.error || 'Command was aborted' });
        } else {
          addLine({ level: 'error', content: result.error || 'Command failed' });
        }
      }
    } catch (err) {
      addLine({ level: 'error', content: `Error: ${err}` });
    } finally {
      setIsRunning(false);
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
      <div className={styles.inputContainer}>
        <form className={styles.inputBar} onSubmit={handleCommandSubmit}>
          <span className={styles.prompt}>{connectedDevice ? connectedDevice : '>'}</span>
          <div className={styles.inputWrapper}>
            <input
              ref={inputRef}
              type="text"
              className={styles.commandInput}
              placeholder="Enter command..."
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onFocus={() => setShowHistory(true)}
              onKeyDown={handleKeyDown}
              disabled={!connectedDevice || isRunning}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {commandHistory.length > 0 && (
              <button
                type="button"
                className={styles.historyToggle}
                onClick={() => setShowHistory(!showHistory)}
                title="Command history"
              >
                ▼
              </button>
            )}
          </div>
          {isRunning ? (
            <Button
              type="button"
              variant="error"
              size="sm"
              onClick={handleAbort}
            >
              Kill
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!connectedDevice || !command.trim()}
            >
              Run
            </Button>
          )}
        </form>
        {showHistory && commandHistory.length > 0 && (
          <div ref={historyRef} className={styles.historyDropdown}>
            <div className={styles.historyHeader}>Recent Commands</div>
            {commandHistory.map((cmd, index) => (
              <div
                key={index}
                className={`${styles.historyItem} ${historyIndex === index ? styles.historyItemActive : ''}`}
                onClick={() => selectHistoryItem(cmd)}
              >
                <span className={styles.historyItemText}>{cmd}</span>
                <button
                  className={styles.historyDeleteBtn}
                  onClick={(e) => deleteFromHistory(index, e)}
                  title="Delete this command"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
