import { useState, useCallback, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import { ApkInstallDialog } from './ApkInstallDialog';
import styles from './ApkDropZone.module.css';

interface ApkFile {
  path: string;
  name: string;
}

export function ApkDropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [apkFile, setApkFile] = useState<ApkFile | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();

    // Set up drag-drop event listeners on the window
    const setupDragDrop = async () => {
      // Listen for drop events
      const unlistenDrop = await appWindow.onDragDropEvent((event) => {
        if (event.payload.type === 'drop') {
          const paths = event.payload.paths;
          console.log('[ApkDropZone] drop received:', paths);

          // Find APK files in the dropped paths
          const apkPath = paths.find((p: string) => p.toLowerCase().endsWith('.apk'));
          if (apkPath) {
            const name = apkPath.split(/[/\\]/).pop() || apkPath;
            setApkFile({ path: apkPath, name });
            setShowDialog(true);
          }
        } else if (event.payload.type === 'enter') {
          console.log('[ApkDropZone] drag-enter');
          setIsDragging(true);
        } else if (event.payload.type === 'leave') {
          console.log('[ApkDropZone] drag-leave');
          setIsDragging(false);
        }
      });

      return unlistenDrop;
    };

    const unlistenPromise = setupDragDrop();

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const handleBrowse = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'APK', extensions: ['apk'] }],
    });
    if (selected && typeof selected === 'string' && selected.toLowerCase().endsWith('.apk')) {
      const name = selected.split(/[/\\]/).pop() || selected;
      setApkFile({ path: selected, name });
      setShowDialog(true);
    }
  }, []);

  const handleClose = () => {
    setShowDialog(false);
    setApkFile(null);
  };

  return (
    <>
      <div className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}>
        <span className={styles.icon}>⬇</span>
        <span className={styles.text}>Drop APK here to install</span>
        <span className={styles.hint}>or</span>
        <button
          type="button"
          className={styles.browseBtn}
          onClick={handleBrowse}
        >
          Browse
        </button>
      </div>

      {showDialog && apkFile && (
        <ApkInstallDialog
          apkPath={apkFile.path}
          apkName={apkFile.name}
          onClose={handleClose}
        />
      )}
    </>
  );
}
