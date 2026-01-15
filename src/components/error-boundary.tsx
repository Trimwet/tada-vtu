'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IonIcon } from '@/components/ion-icon';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-red-500/20 bg-red-500/5">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <IonIcon name="alert-circle" size="32px" color="#ef4444" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Something went wrong
              </h2>
              <p className="text-muted-foreground text-sm">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => window.location.href = '/dashboard'}
                  variant="outline"
                  className="flex-1"
                >
                  <IonIcon name="home" size="18px" className="mr-2" />
                  Go Home
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  <IonIcon name="refresh" size="18px" className="mr-2" />
                  Reload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
