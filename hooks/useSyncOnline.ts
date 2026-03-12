import { useEffect, useState } from 'react';

/**
 * Hook to track online/offline status for the PWA.
 * Firebase RTDB listeners automatically reconnect when the device comes back online.
 */
export const useSyncOnline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log('App online - Firebase listeners will auto-sync');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('App offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};
