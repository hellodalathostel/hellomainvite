
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UIProvider } from './context/UIContext';
import { AuthProvider } from './context/AuthContext';

type SyncCapableServiceWorkerRegistration = ServiceWorkerRegistration & {
  sync: {
    register: (tag: string) => Promise<void>;
  };
};

const hasSyncManager = (
  registration: ServiceWorkerRegistration
): registration is SyncCapableServiceWorkerRegistration => {
  return 'sync' in registration;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </AuthProvider>
  </React.StrictMode>
);

// Register Service Worker for PWA and offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);

        // Handle updates - notify user when new version available
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // New version available
              console.log('New app version available');
            }
          });
        });

        // Request background sync for offline data
        if (hasSyncManager(registration)) {
          window.addEventListener('online', () => {
            registration.sync.register('bookings-sync')
              .catch((err) => console.error('Sync registration failed:', err));
          });
        }
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });

    // Handle messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_DATA') {
        console.log('Service worker requested data sync');
      }
    });
  });

  // Detect online/offline status
  window.addEventListener('online', () => {
    console.log('App is online - syncing data');
  });

  window.addEventListener('offline', () => {
    console.log('App is offline');
  });
}
