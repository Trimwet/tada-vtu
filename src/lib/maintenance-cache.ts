/**
 * Shared maintenance mode cache
 * In production, this should be replaced with Redis or a database
 */

interface MaintenanceCache {
  enabled: boolean;
  timestamp: number;
}

// In-memory cache shared across endpoints
let maintenanceCache: MaintenanceCache | null = null;

export function getMaintenanceStatus(): boolean {
  // Check both cache (from admin toggle) and environment variable (permanent setting)
  return maintenanceCache?.enabled || process.env.MAINTENANCE_MODE === 'true';
}

export function setMaintenanceStatus(enabled: boolean): void {
  maintenanceCache = {
    enabled,
    timestamp: Date.now()
  };
}

export function getMaintenanceCache(): MaintenanceCache | null {
  return maintenanceCache;
}

export function clearMaintenanceCache(): void {
  maintenanceCache = null;
}