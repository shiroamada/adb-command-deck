// ADB Command Deck - Type Definitions

// Generic command result wrapper
export interface CommandResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  error_code: string | null;
}

// ADB Information
export interface AdbInfo {
  path: string;
  version: string;
  is_valid: boolean;
}

// Daemon status states (matches Rust DaemonStatus enum serialization)
export type DaemonStatus = 'Running' | 'Stopped' | 'Starting' | 'Error' | 'unknown';

export interface DaemonStatusResult {
  status: DaemonStatus;
  message?: string;
}

// Device connection states
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Device metrics
export interface DeviceMetrics {
  latency_ms: number | null;
  cpu_percent: number | null;
  memory_mb: number | null;
}

// Diagnostic log entry
export interface DiagnosticLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

// Console line
export interface ConsoleLine {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'cmd' | 'error' | 'live' | 'system' | 'warning';
  content: string;
  deviceId?: string;
}

// Device configuration
export interface DeviceConfig {
  targetIp: string;
  targetPort: string;
  packageName: string | null;
  activityName: string | null;
}

// Quick action definition
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  commandTemplate: string;
  color?: 'primary' | 'secondary' | 'error';
  requiresPackage: boolean;
}

// Theme
export type Theme = 'dark' | 'light' | 'system';

// App screen
export type AppScreen = 'setup' | 'dashboard' | 'logs' | 'settings';
