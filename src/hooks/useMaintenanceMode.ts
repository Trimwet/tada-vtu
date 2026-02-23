import { useState, useEffect } from 'react';

export function useMaintenanceMode() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const response = await fetch('/api/maintenance-status');
        const data = await response.json();
        setIsMaintenanceMode(data.maintenanceMode);
      } catch (error) {
        console.error('Failed to check maintenance status:', error);
        setIsMaintenanceMode(false);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenanceStatus();
    // Check every 10 seconds for faster updates
    const interval = setInterval(checkMaintenanceStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return { isMaintenanceMode, loading };
}

export function useMaintenanceRedirect(redirectPath = '/dashboard?maintenance=true') {
  const { isMaintenanceMode, loading } = useMaintenanceMode();

  useEffect(() => {
    if (!loading && isMaintenanceMode) {
      window.location.href = redirectPath;
    }
  }, [isMaintenanceMode, loading, redirectPath]);

  return { isMaintenanceMode, loading };
}