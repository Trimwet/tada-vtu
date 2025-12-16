'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IonIcon } from '@/components/ion-icon';
import { TrustIndicators } from '@/components/trust-indicators';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = Date.now().toString(36);
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with context
    console.error('Error caught by boundary:', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error?.message.includes('fetch') || 
                            this.state.error?.message.includes('network');

      return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mx-auto">
                <IonIcon 
                  name={isNetworkError ? "wifi-outline" : "alert-circle-outline"} 
                  size="40px" 
                  className="text-red-500" 
                />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground">
                {isNetworkError ? 'Connection Problem' : 'Oops! Something went wrong'}
              </h2>
              
              <p className="text-muted-foreground text-sm leading-relaxed">
                {isNetworkError 
                  ? 'Please check your internet connection and try again.'
                  : "We encountered an unexpected error. Don't worry, your data is safe."
                }
              </p>
              
              {this.state.errorId && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    Error ID: <code className="font-mono">{this.state.errorId}</code>
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                  size="lg"
                >
                  <IonIcon name="refresh-outline" size="18px" className="mr-2" />
                  Try Again
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = '/dashboard')}
                    size="sm"
                  >
                    <IonIcon name="home-outline" size="16px" className="mr-1" />
                    Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.history.back()}
                    size="sm"
                  >
                    <IonIcon name="arrow-back-outline" size="16px" className="mr-1" />
                    Go Back
                  </Button>
                </div>
              </div>
              
              <TrustIndicators variant="inline" className="justify-center pt-2" />
              
              <p className="text-xs text-muted-foreground">
                Need help? Contact us on WhatsApp
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
