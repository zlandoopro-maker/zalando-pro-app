import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { NotificationProvider } from './components/NotificationProvider.tsx';
import './index.css';
import './i18n';

// Global error handler to catch initialization errors and show them on screen if the app fails to mount
window.onerror = function(message, source, lineno, colno, error) {
  const root = document.body;
  if (!document.getElementById('ai-studio-error-overlay')) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'ai-studio-error-overlay';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.width = '100vw';
    errorDiv.style.height = '100vh';
    errorDiv.style.backgroundColor = 'rgba(255,255,255,0.9)';
    errorDiv.style.zIndex = '999999';
    errorDiv.style.display = 'flex';
    errorDiv.style.alignItems = 'center';
    errorDiv.style.justifyContent = 'center';
    errorDiv.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; margin: 20px; max-width: 500px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <h2 style="margin-top: 0; font-size: 1.25rem;">Application Error</h2>
        <p style="margin-bottom: 10px;">${message}</p>
        <div style="font-size: 11px; color: #555; background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #eee; overflow-x: auto;">
          At ${source}:${lineno}:${colno}
          ${error ? `<br><br>Stack Trace:<br>${error.stack}` : ''}
        </div>
        <button onclick="window.location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #721c24; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
        <button onclick="document.getElementById('ai-studio-error-overlay').style.display='none'" style="margin-top: 15px; margin-left: 10px; padding: 8px 16px; background: #ddd; color: #333; border: none; border-radius: 4px; cursor: pointer;">Dismiss</button>
      </div>
    </div>
    `;
    document.body.appendChild(errorDiv);
  }
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </ErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              window.location.reload();
            }
          });
        }
      });
    }).catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}
