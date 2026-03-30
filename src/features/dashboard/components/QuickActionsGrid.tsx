import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDeviceStore, useDeviceConsole, useAppStore } from '../../../stores';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { CommandResult } from '../../../types';
import styles from './QuickActionsGrid.module.css';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'error';
  commands: string[];
  isPinned?: boolean;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'restart_log',
    label: 'Restart & Log',
    icon: '↻',
    variant: 'primary',
    commands: ['{{adb}} logcat -c && {{adb}} shell am force-stop {{package}} && {{adb}} shell am start -n {{package}}/.MainActivity && sleep 15 && {{adb}} logcat -d \'MainActivity:V\' \'FirebaseRemoteConfig:V\' \'*:S\''],
  },
  {
    id: 'uninstall',
    label: 'Uninstall',
    icon: '✕',
    variant: 'error',
    commands: ['{{adb}} shell pm uninstall {{package}}'],
  },
  {
    id: 'check_process',
    label: 'Check Process',
    icon: '◉',
    variant: 'secondary',
    commands: ['{{adb}} shell ps -ef | grep {{package}}'],
  },
  {
    id: 'check_version',
    label: 'Check Version',
    icon: 'ℹ',
    variant: 'secondary',
    commands: ['{{adb}} shell dumpsys package {{package}} | grep versionName'],
  },
];

interface EditModalProps {
  action: QuickAction | null;
  onSave: (action: QuickAction) => void;
  onClose: () => void;
}

function EditModal({ action, onSave, onClose }: EditModalProps) {
  const [label, setLabel] = useState(action?.label || '');
  const [icon, setIcon] = useState(action?.icon || '▶');
  const [command, setCommand] = useState(action?.commands[0] || '');
  const [variant, setVariant] = useState<'primary' | 'secondary' | 'error'>(action?.variant || 'secondary');
  const [showHelp, setShowHelp] = useState(false);

  const handleSave = () => {
    if (!label.trim() || !command.trim()) return;
    onSave({
      id: action?.id || `custom_${Date.now()}`,
      label: label.trim(),
      icon: icon.trim() || '▶',
      variant,
      commands: [command.trim()],
    });
  };

  const insertKeyword = (keyword: string) => {
    setCommand((prev) => prev + keyword);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{action ? 'Edit Action' : 'Add Action'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.formRow}>
            <Input
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Action name"
            />
          </div>
          <div className={styles.formRow}>
            <Input
              label="Icon (emoji)"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="◉"
            />
          </div>
          <div className={styles.formRow}>
            <Input
              label="Command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g., reboot, shell ps -ef | grep {{package}}"
            />
            <div className={styles.keywordRow}>
              <button
                type="button"
                className={styles.keywordBtn}
                onClick={() => insertKeyword('{{adb}}')}
              >
                {'{{adb}}'}
              </button>
              <button
                type="button"
                className={styles.keywordBtn}
                onClick={() => insertKeyword('{{ip}}')}
              >
                {'{{ip}}'}
              </button>
              <button
                type="button"
                className={styles.keywordBtn}
                onClick={() => insertKeyword('{{port}}')}
              >
                {'{{port}}'}
              </button>
              <button
                type="button"
                className={styles.keywordBtn}
                onClick={() => insertKeyword('{{package}}')}
              >
                {'{{package}}'}
              </button>
              <button
                type="button"
                className={styles.keywordBtn}
                onClick={() => insertKeyword('{{activity_name}}')}
              >
                {'{{activity_name}}'}
              </button>
              <button
                type="button"
                className={styles.keywordBtn}
                onClick={() => setShowHelp(!showHelp)}
                style={{ background: 'transparent', border: '1px dashed var(--color-outline-variant)' }}
              >
                ?
              </button>
            </div>
            {showHelp && (
              <div className={styles.keywordHelp}>
                <div className={styles.keywordHelpTitle}>Keyword Reference</div>
                <div className={styles.keywordItem}>
                  <code>{'{{adb}}'}</code> - Full adb command with device (e.g., <code>adb -s 192.168.1.1:5555</code>)
                  <br />
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                    Use for combo commands with multiple adb calls
                  </span>
                </div>
                <div className={styles.keywordItem}>
                  <code>{'{{ip}}'}</code> - Device IP address (e.g., <code>192.168.1.1</code>)
                </div>
                <div className={styles.keywordItem}>
                  <code>{'{{port}}'}</code> - Device port (e.g., <code>5555</code>)
                </div>
                <div className={styles.keywordItem}>
                  <code>{'{{package}}'}</code> - Package name from config (e.g., <code>com.example.app</code>)
                  <br />
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                    Use when command needs the package name
                  </span>
                </div>
                <div className={styles.keywordItem}>
                  <code>{'{{activity_name}}'}</code> - Activity name from config (e.g., <code>.MainActivity</code>)
                  <br />
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                    Use for starting activities
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className={styles.formRow}>
            <label className={styles.variantLabel}>Variant</label>
            <div className={styles.variantButtons}>
              <Button
                size="sm"
                variant={variant === 'primary' ? 'primary' : 'ghost'}
                onClick={() => setVariant('primary')}
              >
                Primary
              </Button>
              <Button
                size="sm"
                variant={variant === 'secondary' ? 'secondary' : 'ghost'}
                onClick={() => setVariant('secondary')}
              >
                Secondary
              </Button>
              <Button
                size="sm"
                variant={variant === 'error' ? 'error' : 'ghost'}
                onClick={() => setVariant('error')}
              >
                Error
              </Button>
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={!label.trim() || !command.trim()}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QuickActionsGrid() {
  const { devices, activeDeviceId } = useDeviceStore();
  const { addLine } = useDeviceConsole(activeDeviceId);
  const { customActions, setCustomActions, updateCustomAction, addCustomAction, deleteCustomAction } = useAppStore();

  const activeDevice = activeDeviceId ? devices[activeDeviceId] : null;
  const connectedDevice = activeDevice?.connectedDevice;
  const packageName = activeDevice?.packageName;
  const activityName = activeDevice?.activityName;
  const targetIp = activeDevice?.targetIp;
  const targetPort = activeDevice?.targetPort;
  const connectionStatus = activeDevice?.connectionStatus;

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingAction, setEditingAction] = useState<QuickAction | null | 'new'>(null);

  // Build actions list: start with defaults, then overlay customActions overrides
  // customActions can override defaults (by same ID) or add new custom actions
  const actionOverrides = new Map(customActions.map((a) => [a.id, a]));
  const allActions = DEFAULT_ACTIONS.map((defaultAction) =>
    actionOverrides.has(defaultAction.id) ? actionOverrides.get(defaultAction.id)! : defaultAction
  ).concat(customActions.filter((a) => a.id.startsWith('custom_')));

  const sortedActions = [...allActions].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const executeAction = async (action: QuickAction) => {
    if (!connectedDevice) {
      addLine({ level: 'error', content: 'No device connected' });
      return;
    }

    const needsPackage = action.commands.some((cmd) => cmd.includes('{{package}}'));

    if (needsPackage && !packageName) {
      addLine({
        level: 'warning',
        content: `Package name required for "${action.label}"`,
      });
      return;
    }

    addLine({ level: 'system', content: `Executing: ${action.label}` });

    for (const cmdTemplate of action.commands) {
      // Replace placeholders with actual values
      let cmd = cmdTemplate
        .replace(/\{\{adb\}\}/g, `adb -s ${connectedDevice}`)
        .replace(/\{\{ip\}\}/g, targetIp || '')
        .replace(/\{\{port\}\}/g, targetPort || '')
        .replace(/\{\{package\}\}/g, packageName || '')
        .replace(/\{\{activity_name\}\}/g, activityName || '');

      addLine({ level: 'cmd', content: cmd });

      try {
        const result = await invoke<CommandResult<string>>('execute_command', {
          deviceId: connectedDevice,
          command: cmd,
        });

        if (result.success) {
          // Show output if any
          if (result.data && result.data.trim()) {
            result.data.trim().split('\n').forEach((line) => {
              addLine({ level: 'info', content: line });
            });
          }
          addLine({
            level: 'success',
            content: `${action.label} completed`,
          });
        } else {
          addLine({
            level: 'error',
            content: `${action.label} failed: ${result.error}`,
          });
        }
      } catch (err) {
        addLine({ level: 'error', content: `Error: ${err}` });
      }
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const currentOrder = [...customActions];
    const draggedIdx = currentOrder.findIndex((a) => a.id === draggedId);
    const targetIdx = currentOrder.findIndex((a) => a.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const [dragged] = currentOrder.splice(draggedIdx, 1);
    currentOrder.splice(targetIdx, 0, dragged);
    setCustomActions(currentOrder);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const togglePin = (id: string) => {
    const action = customActions.find((a) => a.id === id);
    if (action) {
      updateCustomAction({ ...action, isPinned: !action.isPinned });
    }
  };

  const handleSaveAction = (action: QuickAction) => {
    const existingIndex = customActions.findIndex((a) => a.id === action.id);
    if (existingIndex !== -1) {
      // Update existing custom action or override of default
      updateCustomAction(action);
    } else {
      // New custom action
      addCustomAction(action);
    }
    setEditingAction(null);
  };

  const handleDeleteAction = (id: string) => {
    deleteCustomAction(id);
    setEditingAction(null);
  };

  const handleResetToDefault = () => {
    setCustomActions([]);
    setEditMode(false);
    setEditingAction(null);
  };

  const isDisabled = connectionStatus !== 'connected';

  return (
    <Card variant="elevated" className={styles.card}>
      <CardHeader>
        <div className={styles.headerRow}>
          <h3 className={styles.title}>Operation Shortcuts</h3>
          <div className={styles.headerActions}>
            <Button variant="ghost" size="sm" onClick={() => setEditingAction('new')}>
              + Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditMode(!editMode)}>
              {editMode ? 'Done' : 'Edit'}
            </Button>
            {customActions.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleResetToDefault}>
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={styles.grid}>
          {sortedActions.map((action) => (
            <div
              key={action.id}
              draggable={editMode}
              onDragStart={() => handleDragStart(action.id)}
              onDragOver={(e) => handleDragOver(e, action.id)}
              onDragEnd={handleDragEnd}
              className={`${styles.actionWrapper} ${draggedId === action.id ? styles.dragging : ''} ${editMode ? styles.editing : ''}`}
            >
              <Button
                variant={action.variant}
                onClick={() => executeAction(action)}
                disabled={isDisabled}
                className={styles.actionBtn}
              >
                <span className={styles.icon}>{action.icon}</span>
                <span className={styles.label}>{action.label}</span>
              </Button>
              {editMode && (
                <div className={styles.actionOverlay}>
                  <button
                    className={`${styles.pinBtn} ${action.isPinned ? styles.pinned : ''}`}
                    onClick={() => togglePin(action.id)}
                    title={action.isPinned ? 'Unpin' : 'Pin'}
                  >
                    📌
                  </button>
                  <button
                    className={styles.editBtn}
                    onClick={() => setEditingAction(action)}
                    title="Edit"
                  >
                    ✎
                  </button>
                  {action.id.startsWith('custom_') && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteAction(action.id)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>

      {editingAction && (
        <EditModal
          action={editingAction === 'new' ? null : editingAction}
          onSave={handleSaveAction}
          onClose={() => setEditingAction(null)}
        />
      )}
    </Card>
  );
}
