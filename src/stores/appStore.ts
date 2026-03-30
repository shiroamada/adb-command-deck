import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, AppScreen } from '../types';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'error';
  commands: string[];
  isPinned?: boolean;
}

interface AppState {
  theme: Theme;
  consoleTheme: 'dark' | 'light';
  activeScreen: AppScreen;
  sidebarCollapsed: boolean;
  customActions: QuickAction[];
  isInitializing: boolean;
  setTheme: (theme: Theme) => void;
  setConsoleTheme: (theme: 'dark' | 'light') => void;
  setActiveScreen: (screen: AppScreen) => void;
  toggleSidebar: () => void;
  setCustomActions: (actions: QuickAction[]) => void;
  addCustomAction: (action: QuickAction) => void;
  updateCustomAction: (action: QuickAction) => void;
  deleteCustomAction: (id: string) => void;
  setIsInitializing: (initializing: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      consoleTheme: 'dark',
      activeScreen: 'setup',
      sidebarCollapsed: false,
      customActions: [],
      isInitializing: true,
      setTheme: (theme) => set({ theme }),
      setConsoleTheme: (consoleTheme) => set({ consoleTheme }),
      setActiveScreen: (screen) => set({ activeScreen: screen }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setCustomActions: (customActions) => set({ customActions }),
      addCustomAction: (action) => set((state) => ({ customActions: [...state.customActions, action] })),
      updateCustomAction: (action) => set((state) => ({
        customActions: state.customActions.map((a) => (a.id === action.id ? action : a)),
      })),
      deleteCustomAction: (id) => set((state) => ({
        customActions: state.customActions.filter((a) => a.id !== id),
      })),
      setIsInitializing: (isInitializing) => set({ isInitializing }),
    }),
    {
      name: 'adb-command-deck-app',
      partialize: (state) => ({
        theme: state.theme,
        consoleTheme: state.consoleTheme,
        sidebarCollapsed: state.sidebarCollapsed,
        customActions: state.customActions,
      }),
    }
  )
);
