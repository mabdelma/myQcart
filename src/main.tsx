import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { InstallBanner } from './components/ui/InstallBanner';
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';
import { initSentry } from './lib/monitoring';
import { ErrorBoundary } from './lib/ErrorBoundary';
import './index.css';

initSentry();

function AppWithMonitoring() {
  usePerformanceMonitoring();
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppWithMonitoring />
      <InstallBanner />
    </ErrorBoundary>
  </StrictMode>
);
