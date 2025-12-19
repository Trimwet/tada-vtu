'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IonIcon } from '@/components/ion-icon';
import { Logo } from '@/components/logo';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { AnimatedBackgroundWrapper } from '@/components/animated-background-wrapper';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle, isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle autofill
  useEffect(() => {
    const checkAutofill = () => {
      if (emailRef.current?.value && emailRef.current.value !== email) setEmail(emailRef.current.value);
      if (passwordRef.current?.value && passwordRef.current.value !== password) setPassword(passwordRef.current.value);
    };
    const timers = [100, 500, 1000].map(t => setTimeout(checkAutofill, t));
    return () => timers.forEach(clearTimeout);
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailValue = emailRef.current?.value || email;
    const passwordValue = passwordRef.current?.value || password;
    
    if (!emailValue || !passwordValue) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(emailValue, passwordValue);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      if (message.includes('Invalid login')) {
        toast.error('Invalid email or password');
      } else if (message.includes('Email not confirmed')) {
        toast.error('Please verify your email first');
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };


  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-black relative flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackgroundWrapper />
      
      {/* Green gradient accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="flex justify-center">
          <Logo size="lg" href="/" />
        </div>

        {/* Glassmorphism card */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl shadow-green-500/5">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-white">Welcome Back</h1>
            <p className="text-gray-400 text-sm">Sign in to your account to continue</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-300">Email</Label>
              <div className="relative">
                <IonIcon name="mail-outline" size="18px" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input ref={emailRef} id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full h-11 pl-10 pr-3 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-300">Password</Label>
                <Link href="/forgot-password" className="text-sm text-green-500 hover:text-green-400 transition-colors">Forgot password?</Link>
              </div>
              <div className="relative">
                <IonIcon name="lock-closed-outline" size="18px" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input ref={passwordRef} id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full h-11 pl-10 pr-10 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  <IonIcon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size="18px" />
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold h-11 transition-colors" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent backdrop-blur-sm px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full h-11 border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] transition-colors" disabled={googleLoading}
            onClick={async () => {
              setGoogleLoading(true);
              try { await signInWithGoogle(); } catch { toast.error('Failed to sign in with Google'); setGoogleLoading(false); }
            }}>
            {googleLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                Connecting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </div>
            )}
          </Button>

          <div className="text-center text-sm">
            <span className="text-gray-500">Don&apos;t have an account? </span>
            <Link href="/register" className="text-green-500 hover:text-green-400 font-medium transition-colors">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
