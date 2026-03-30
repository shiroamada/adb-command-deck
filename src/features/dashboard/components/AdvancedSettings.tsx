import { Input } from '../../../components/ui/Input';
import styles from './AdvancedSettings.module.css';

interface AdvancedSettingsProps {
  port: string;
  onPortChange: (port: string) => void;
  disabled?: boolean;
}

export function AdvancedSettings({ port, onPortChange, disabled }: AdvancedSettingsProps) {
  return (
    <div className={styles.container}>
      <Input
        label="Port"
        placeholder="5555"
        value={port}
        onChange={(e) => onPortChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
