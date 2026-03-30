import { useDeviceStore } from '../../../stores';
import { Card, CardContent } from '../../../components/ui/Card';
import styles from './MetricsCards.module.css';

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  variant: 'primary' | 'secondary' | 'tertiary';
}

function MetricCard({ label, value, unit, variant }: MetricCardProps) {
  return (
    <Card variant="outlined" className={styles.card}>
      <CardContent>
        <span className={`${styles.label} ${styles[variant]}`}>{label}</span>
        <div className={styles.valueContainer}>
          <span className={`${styles.value} ${styles[variant]}`}>{value}</span>
          <span className={`${styles.unit} ${styles[variant]}`}>{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsCards() {
  const { devices, activeDeviceId } = useDeviceStore();
  const activeDevice = activeDeviceId ? devices[activeDeviceId] : null;
  const sessionMetrics = activeDevice?.sessionMetrics;

  const formatMetric = (value: number | null | undefined, fallback: string = '--'): string => {
    if (value === null || value === undefined) return fallback;
    return value.toFixed(value % 1 === 0 ? 0 : 1);
  };

  return (
    <div className={styles.container}>
      <MetricCard
        label="Network Latency"
        value={formatMetric(sessionMetrics?.latency_ms)}
        unit="ms"
        variant="primary"
      />
      <MetricCard
        label="CPU Usage (Device)"
        value={formatMetric(sessionMetrics?.cpu_percent)}
        unit="%"
        variant="secondary"
      />
      <MetricCard
        label="Memory Load"
        value={formatMetric(sessionMetrics?.memory_mb)}
        unit="GB"
        variant="tertiary"
      />
    </div>
  );
}
