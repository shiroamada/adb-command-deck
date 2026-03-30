import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConsoleLine } from '../types';

interface ConsoleHistory {
  lines: ConsoleLine[];
}

interface ConsoleState {
  // Console history per device, keyed by device ID
  history: Record<string, ConsoleHistory>;
  isStreaming: boolean;
  autoScroll: boolean;

  // Actions
  addLine: (deviceId: string, line: Omit<ConsoleLine, 'id' | 'timestamp'>) => void;
  addLines: (deviceId: string, lines: Omit<ConsoleLine, 'id' | 'timestamp'>[]) => void;
  clearLines: (deviceId: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setAutoScroll: (autoScroll: boolean) => void;
  reset: (deviceId: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useConsoleStore = create<ConsoleState>()(
  persist(
    (set) => ({
      history: {},
      isStreaming: false,
      autoScroll: true,

      addLine: (deviceId, line) =>
        set((state) => {
          const deviceHistory = state.history[deviceId] || { lines: [] };
          return {
            history: {
              ...state.history,
              [deviceId]: {
                lines: [
                  ...deviceHistory.lines,
                  {
                    ...line,
                    id: generateId(),
                    timestamp: new Date(),
                  },
                ],
              },
            },
          };
        }),

      addLines: (deviceId, lines) =>
        set((state) => {
          const deviceHistory = state.history[deviceId] || { lines: [] };
          return {
            history: {
              ...state.history,
              [deviceId]: {
                lines: [
                  ...deviceHistory.lines,
                  ...lines.map((line) => ({
                    ...line,
                    id: generateId(),
                    timestamp: new Date(),
                  })),
                ],
              },
            },
          };
        }),

      clearLines: (deviceId) =>
        set((state) => ({
          history: {
            ...state.history,
            [deviceId]: { lines: [] },
          },
        })),

      setIsStreaming: (streaming) => set({ isStreaming: streaming }),

      setAutoScroll: (autoScroll) => set({ autoScroll }),

      reset: (deviceId) =>
        set((state) => ({
          history: {
            ...state.history,
            [deviceId]: { lines: [] },
          },
          isStreaming: false,
          autoScroll: true,
        })),
    }),
    {
      name: 'adb-command-deck-console',
    }
  )
);

// Helper hook to get lines for a specific device
export function useDeviceConsole(deviceId: string | null) {
  const { history, addLine, addLines, clearLines, setIsStreaming, setAutoScroll, reset } = useConsoleStore();
  const lines = deviceId ? (history[deviceId]?.lines || []) : [];
  return {
    lines,
    addLine: (line: Omit<ConsoleLine, 'id' | 'timestamp'>) => deviceId && addLine(deviceId, line),
    addLines: (lines: Omit<ConsoleLine, 'id' | 'timestamp'>[]) => deviceId && addLines(deviceId, lines),
    clearLines: () => deviceId && clearLines(deviceId),
    setIsStreaming,
    setAutoScroll,
    reset: () => deviceId && reset(deviceId),
  };
}
