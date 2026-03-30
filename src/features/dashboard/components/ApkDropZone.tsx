import { useState, useCallback, useRef, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
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
  const [manualPath, setManualPath] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.apk')) {
      const filePath = (file as File & { path?: string }).path;
      if (filePath && filePath.length > 0 && filePath !== file.name) {
        setApkFile({ path: filePath, name: file.name });
      } else {
        setApkFile({ path: file.name, name: file.name });
      }
      setShowDialog(true);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleManualSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (manualPath.trim()) {
      const path = manualPath.trim();
      const name = path.split(/[/\\]/).pop() || path;
      setApkFile({ path, name });
      setShowDialog(true);
      setManualPath('');
    }
  }, [manualPath]);

  const handleClose = () => {
    setShowDialog(false);
    setApkFile(null);
  };

  return (
    <>
      <div className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".apk"
          onChange={handleFileSelect}
          className={styles.fileInput}
        />
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

        <form className={styles.manualForm} onSubmit={handleManualSubmit}>
          <input
            type="text"
            className={styles.manualInput}
            placeholder="Or paste APK path here..."
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
          />
          <button type="submit" className={styles.submitBtn} disabled={!manualPath.trim()}>
            →
          </button>
        </form>
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
