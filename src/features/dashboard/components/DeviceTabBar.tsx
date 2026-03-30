import { useState } from 'react';
import { useDeviceStore, useConsoleStore } from '../../../stores';
import { Button } from '../../../components/ui/Button';
import styles from './DeviceTabBar.module.css';

interface CloseConfirmDialogProps {
  deviceLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function CloseConfirmDialog({ deviceLabel, onConfirm, onCancel }: CloseConfirmDialogProps) {
  return (
    <div className={styles.confirmOverlay} onClick={onCancel}>
      <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.confirmHeader}>
          <h3>Close Session?</h3>
        </div>
        <div className={styles.confirmContent}>
          <p>Are you sure you want to close <strong>{deviceLabel}</strong>?</p>
          <p className={styles.warnText}>Terminal history will be cleared.</p>
        </div>
        <div className={styles.confirmActions}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="error" onClick={onConfirm}>Close</Button>
        </div>
      </div>
    </div>
  );
}

const MAX_CUSTOM_NAME_LENGTH = 20;

export function DeviceTabBar() {
  const {
    devices,
    activeDeviceId,
    addDevice,
    removeDevice,
    setActiveDeviceId,
    setCustomName,
  } = useDeviceStore();

  const [confirmClose, setConfirmClose] = useState<{ id: string; label: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const deviceList = Object.values(devices);

  const handleClose = (deviceId: string) => {
    const device = devices[deviceId];
    const label = device?.connectedDevice || device?.targetIp || 'this device';

    // If device has connection history, show confirmation
    if (device?.connectionStatus === 'connected' || device?.connectionStatus === 'connecting') {
      setConfirmClose({ id: deviceId, label });
    } else {
      removeDevice(deviceId);
    }
  };

  const handleConfirmClose = () => {
    if (confirmClose) {
      // Clear the terminal history for this device before removing
      useConsoleStore.getState().clearLines(confirmClose.id);
      removeDevice(confirmClose.id);
      setConfirmClose(null);
    }
  };

  const handleCancelClose = () => {
    setConfirmClose(null);
  };

  const handleStartEdit = (deviceId: string, currentName: string) => {
    setEditingId(deviceId);
    setEditingName(currentName);
  };

  const handleSaveEdit = (deviceId: string) => {
    const trimmed = editingName.trim();
    setCustomName(deviceId, trimmed.length > 0 ? trimmed : null);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, deviceId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(deviceId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getTabDisplayName = (device: typeof devices[string]) => {
    if (device.customName) return device.customName;
    if (device.connectedDevice) return device.connectedDevice;
    if (device.targetIp) return device.targetIp;
    return 'New Device';
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.tabs}>
          {deviceList.map((device) => (
            <div
              key={device.id}
              className={`${styles.tab} ${device.id === activeDeviceId ? styles.active : ''}`}
              onClick={() => setActiveDeviceId(device.id)}
            >
              <span className={styles.tabIcon}>
                {device.connectionStatus === 'connected' ? '◉' : '○'}
              </span>
              {editingId === device.id ? (
                <input
                  type="text"
                  className={styles.tabEditInput}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value.slice(0, MAX_CUSTOM_NAME_LENGTH))}
                  onBlur={() => handleSaveEdit(device.id)}
                  onKeyDown={(e) => handleEditKeyDown(e, device.id)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  maxLength={MAX_CUSTOM_NAME_LENGTH}
                />
              ) : (
                <span
                  className={styles.tabLabel}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(device.id, getTabDisplayName(device));
                  }}
                >
                  {getTabDisplayName(device)}
                </span>
              )}
              <button
                className={styles.editBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit(device.id, getTabDisplayName(device));
                }}
                title="Rename tab"
              >
                ✎
              </button>
              {deviceList.length > 1 && (
                <button
                  className={styles.closeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose(device.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button className={styles.addBtn} onClick={addDevice} title="Add new device">
          +
        </button>
      </div>

      {confirmClose && (
        <CloseConfirmDialog
          deviceLabel={confirmClose.label}
          onConfirm={handleConfirmClose}
          onCancel={handleCancelClose}
        />
      )}
    </>
  );
}
