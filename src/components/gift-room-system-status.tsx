"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IonIcon } from "@/components/ion-icon";

interface SystemHealthCheck {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
}

interface SystemStats {
  giftRooms: {
    total: number;
    active: number;
    expired: number;
    totalValue: number;
  };
  reservations: {
    total: number;
    active: number;
    claimed: number;
  };
  claims: {
    total: number;
    totalValue: number;
    referralBonuses: number;
  };
}

interface HealthData {
  status: 'healthy' | 'warning' | 'error';
  timestamp: string;
  health_checks: SystemHealthCheck[];
  system_stats: SystemStats;
  configuration: {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  };
}

export function GiftRoomSystemStatus() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/gift-rooms/health');
      const data = await response.json();
      
      if (response.ok) {
        setHealthData(data);
      } else {
        setError(data.error || 'Failed to fetch health data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Health check error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'error': return 'close-circle';
      default: return 'help-circle';
    }
  };

  if (loading && !healthData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking system health...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !healthData) {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <IonIcon name="alert-circle" size="32px" className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Health Check Failed
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchHealthData} variant="outline">
            <IonIcon name="refresh" size="16px" className="mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!healthData) return null;

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IonIcon name={getStatusIcon(healthData.status)} size="24px" />
                Gift Room System Status
              </CardTitle>
              <CardDescription>
                Last checked: {new Date(healthData.timestamp).toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(healthData.status)} text-white`}>
                {healthData.status.toUpperCase()}
              </Badge>
              <Button onClick={fetchHealthData} variant="outline" size="sm" disabled={loading}>
                <IonIcon name="refresh" size="16px" className={loading ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* System Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>System Statistics</CardTitle>
          <CardDescription>Current system usage and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-500">
                {healthData.system_stats.giftRooms.total}
              </div>
              <div className="text-sm text-muted-foreground">Total Gift Rooms</div>
            </div>
            
            <div className="text-center p-4 bg-blue-500/10 rounded-lg">
              <div className="text-2xl font-bold text-blue-500">
                {healthData.system_stats.giftRooms.active}
              </div>
              <div className="text-sm text-muted-foreground">Active Rooms</div>
            </div>
            
            <div className="text-center p-4 bg-purple-500/10 rounded-lg">
              <div className="text-2xl font-bold text-purple-500">
                {healthData.system_stats.claims.total}
              </div>
              <div className="text-sm text-muted-foreground">Total Claims</div>
            </div>
            
            <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
              <div className="text-2xl font-bold text-emerald-500">
                ₦{healthData.system_stats.claims.totalValue.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Claimed</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Gift Rooms</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active:</span>
                  <span className="font-medium">{healthData.system_stats.giftRooms.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expired:</span>
                  <span className="font-medium">{healthData.system_stats.giftRooms.expired}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="font-medium">₦{healthData.system_stats.giftRooms.totalValue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Reservations</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active:</span>
                  <span className="font-medium">{healthData.system_stats.reservations.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Claimed:</span>
                  <span className="font-medium">{healthData.system_stats.reservations.claimed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">{healthData.system_stats.reservations.total}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Claims</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Claims:</span>
                  <span className="font-medium">{healthData.system_stats.claims.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referral Bonuses:</span>
                  <span className="font-medium">{healthData.system_stats.claims.referralBonuses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="font-medium">₦{healthData.system_stats.claims.totalValue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Component Health Checks</CardTitle>
          <CardDescription>Status of individual system components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {healthData.health_checks.map((check, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className={`w-3 h-3 rounded-full mt-1 ${getStatusColor(check.status)}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{check.component}</h4>
                    <Badge variant="outline" className={`text-xs ${
                      check.status === 'healthy' ? 'border-green-500 text-green-500' :
                      check.status === 'warning' ? 'border-yellow-500 text-yellow-500' :
                      'border-red-500 text-red-500'
                    }`}>
                      {check.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{check.message}</p>
                  {check.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        View Details
                      </summary>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(check.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Issues */}
      {(healthData.configuration.issues.length > 0 || healthData.configuration.recommendations.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>System configuration status and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            {healthData.configuration.issues.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-red-500 mb-2 flex items-center gap-2">
                  <IonIcon name="alert-circle" size="16px" />
                  Issues
                </h4>
                <ul className="space-y-1">
                  {healthData.configuration.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                      <span className="w-1 h-1 bg-red-500 rounded-full mt-2 shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {healthData.configuration.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-yellow-600 mb-2 flex items-center gap-2">
                  <IonIcon name="bulb" size="16px" />
                  Recommendations
                </h4>
                <ul className="space-y-1">
                  {healthData.configuration.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
                      <span className="w-1 h-1 bg-yellow-500 rounded-full mt-2 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}