import { useEffect, useState } from 'react';
import { AppShell } from './components/layout';
import { SplashScreen } from './components/SplashScreen';
import { SetupWizardScreen } from './features/setup/SetupWizardScreen';
import { DashboardScreen } from './features/dashboard/DashboardScreen';
import { LogsScreen } from './features/dashboard/LogsScreen';
import { SettingsScreen } from './features/dashboard/SettingsScreen';
import { useAppStore } from './stores';
import './styles/global.css';

function App() {
  const { activeScreen, theme, isInitializing, setIsInitializing } = useAppStore();
  const [initSuccess, setInitSuccess] = useState(false);

  useEffect(() => {
    const applyTheme = () => {
      document.body.classList.remove('light', 'dark');
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (!isDark) {
          document.body.classList.add('light');
        }
      } else if (theme === 'light') {
        document.body.classList.add('light');
      }
    };

    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const handleInitComplete = (success: boolean) => {
    setIsInitializing(false);
    setInitSuccess(success);
  };

  // Show splash screen during initialization
  if (isInitializing) {
    return <SplashScreen onComplete={handleInitComplete} />;
  }

  const renderScreen = () => {
    // If initialization failed, always show setup wizard
    if (!initSuccess && activeScreen === 'dashboard') {
      return <SetupWizardScreen />;
    }

    switch (activeScreen) {
      case 'setup':
        return <SetupWizardScreen />;
      case 'dashboard':
        return <DashboardScreen />;
      case 'logs':
        return <LogsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return <AppShell>{renderScreen()}</AppShell>;
}

export default App;
