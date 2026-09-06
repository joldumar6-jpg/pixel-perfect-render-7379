
import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50 animate-pulse">
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg">
        <WifiOff className="w-4 h-4 text-orange-400" />
        <span className="text-sm text-orange-400 font-medium">Modo Offline</span>
      </div>
    </div>
  );
}
