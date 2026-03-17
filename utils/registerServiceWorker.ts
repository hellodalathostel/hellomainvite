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

export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?v=${__APP_BUILD_ID__}`)
      .then((registration) => {
        console.log('Service Worker registered:', registration);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('New app version available');
            }
          });
        });

        if (hasSyncManager(registration)) {
          window.addEventListener('online', () => {
            registration.sync.register('bookings-sync')
              .then(() => console.log('Background sync registered'))
              .catch((err) => console.log('Sync registration failed:', err));
          });
        }
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_DATA') {
        console.log('Service worker requested data sync');
      }
    });
  });

  window.addEventListener('online', () => {
    console.log('App is online - syncing data');
  });

  window.addEventListener('offline', () => {
    console.log('App is offline');
  });
};