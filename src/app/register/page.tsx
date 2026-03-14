'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IonIcon } from '@/components/ion-icon';
import { Logo } from '@/components/logo';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { AnimatedBackgroundWrapper } from '@/components/animated-background-wrapper';
import { LoadingScreen } from '@/components/loading-screen';
import { ButtonLoading } from '@/components/loading-icons';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, isAuthenticated, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  // Check for referral code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName || !email || !phoneNumber || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!/^0\d{10}$/.test(phoneNumber)) {
      toast.error('Please enter a valid Nigerian phone number');
      return;
    }

    setLoading(true);
    try {
      const { user } = await signUp(email, password, fullName, phoneNumber, referralCode || undefined);
      if (user) {
        toast.success('Account created successfully!');
        router.push('/dashboard');
      } else {
        toast.success('Please check your email to verify your account');
        router.push('/login');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      if (message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in.');
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-11 pl-10 pr-3 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors";

  if (authLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-black relative flex overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackgroundWrapper />

      {/* Left panel — illustration (desktop only) */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 relative px-12 bg-gradient-to-br from-green-500/10 via-transparent to-transparent border-r border-white/5">
        <div className="absolute top-0 left-0 w-full h-full bg-green-500/5 blur-[120px] pointer-events-none" />
        <div className="relative z-10 max-w-sm text-center">
          <img
            src="/illustration-shopping.svg"
            alt="Person shopping on phone"
            className="w-72 h-72 mx-auto mb-8 opacity-90 drop-shadow-[0_0_60px_rgba(34,197,94,0.15)]"
          />
          <h2 className="text-2xl font-bold text-white mb-3">Join TADA VTU</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Get instant airtime & data at the best rates. Earn ₦100 for every friend you refer.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="text-center">
              <p className="text-lg font-bold text-green-500">1.8K+</p>
              <p className="text-xs text-gray-500">Users</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-lg font-bold text-green-500">₦100</p>
              <p className="text-xs text-gray-500">Referral Bonus</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-lg font-bold text-green-500">99.8%</p>
              <p className="text-xs text-gray-500">Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col items-center justify-center flex-1 lg:flex-none lg:w-[480px] p-6 relative z-10">
      {/* Green gradient accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo size="lg" href="/" />
        </div>

        {/* Glassmorphism card */}
        <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl shadow-green-500/5">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-white">Create Account</h1>
            <p className="text-gray-400 text-sm">Sign up to start using TADA VTU</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-300">Full Name</Label>
              <div className="relative">
                <IonIcon name="person-outline" size="18px" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input id="fullName" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputClass} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-300">Email</Label>
              <div className="relative">
                <IonIcon name="mail-outline" size="18px" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-300">Phone Number</Label>
              <div className="relative">
                <IonIcon name="call-outline" size="18px" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input id="phone" type="tel" placeholder="08012345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required className={inputClass} />
              </div>
            </div>


            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-300">Password</Label>
              <div className="relative">
                <IonIcon name="lock-closed-outline" size="18px" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full h-11 pl-10 pr-10 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  <IonIcon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size="18px" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">Confirm Password</Label>
              <div className="relative">
                <IonIcon name="lock-closed-outline" size="18px" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode" className="text-sm font-medium text-gray-300">
                Referral Code <span className="text-gray-500 font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <IonIcon name="gift-outline" size="18px" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input id="referralCode" type="text" placeholder="Enter referral code" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className={inputClass} />
              </div>
              {referralCode && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <IonIcon name="checkmark-circle" size="12px" />
                  Referral code applied! You&apos;ll both get ₦100 bonus
                </p>
              )}
            </div>

            <Button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold h-11 transition-colors" disabled={loading}>
              {loading ? (
                <ButtonLoading type="sending" text="Creating account..." />
              ) : 'Create Account'}
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
              try { await signInWithGoogle(); } catch { toast.error('Failed to sign up with Google'); setGoogleLoading(false); }
            }}>
            {googleLoading ? (
              <ButtonLoading type="loading" text="Connecting..." />
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
            <span className="text-gray-500">Already have an account? </span>
            <Link href="/login" className="text-green-500 hover:text-green-400 font-medium transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
