"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogoInline } from "@/components/logo";
import { LiveTransactionTicker } from "@/components/stats-counter";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { useAllDataPlans } from "@/hooks/useDataPlans";
import { AnimatedBackgroundWrapper } from "@/components/animated-background-wrapper";

function PricingTeaser() {
  const { plans, loading } = useAllDataPlans();

  // Get one popular plan per network from live data
  const teaserPlans = [
    { net: "MTN", plan: plans.MTN?.[0] || { name: "1GB (SME)", price: 280 } },
    { net: "Airtel", plan: plans.AIRTEL?.[0] || { name: "2GB (Direct)", price: 550 } },
    { net: "Glo", plan: plans.GLO?.[0] || { name: "5GB (Gift)", price: 1200 } },
    { net: "9mobile", plan: plans['9MOBILE']?.[0] || { name: "3GB (SME)", price: 450 } },
  ];

  return (
    <section id="pricing" className="py-24 px-6 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-green-500/5 blur-[120px] pointer-events-none" />
      <div className="container mx-auto relative">
        <div className="text-center mb-16">
          <p className="text-green-500 text-sm font-medium mb-3 uppercase tracking-widest">LIVE RATES</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Unbeatable Data Pricing</h2>
          <p className="text-gray-400 max-w-xl mx-auto">Get more for less. Our rates are calculated in real-time to ensure you always get the best deal in Nigeria.</p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center bg-white/[0.02] border border-white/10 rounded-2xl p-8 md:p-16 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-yellow-500 border-2 border-black flex items-center justify-center text-[10px] font-bold text-black">MTN</div>
                <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-black flex items-center justify-center text-[10px] font-bold text-white">Air</div>
                <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-black flex items-center justify-center text-[10px] font-bold text-black">Glo</div>
                <div className="w-8 h-8 rounded-full bg-green-400 border-2 border-black flex items-center justify-center text-[10px] font-bold text-black">9m</div>
              </div>
              <span className="text-sm text-gray-500">All local networks supported</span>
            </div>

            <h3 className="text-3xl font-bold text-white mb-6">Explore Our Full <br /><span className="text-green-500">Price Catalogue</span></h3>

            <ul className="space-y-4 mb-10">
              {[
                "Real-time data plan updates",
                "4 Loyalty tiers with custom discounts",
                "No hidden delivery charges",
                "Auto-purchase triggers enabled"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-400">
                  <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <Button size="lg" className="bg-green-500 hover:bg-green-400 text-black font-bold px-10 h-14 rounded-xl group" asChild>
              <Link href="/pricing">
                View Live Price List
                <ArrowRight weight="bold" className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-green-500/20 rounded-2xl blur-2xl opacity-50" />
            <div className="relative bg-black border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                  {loading ? 'Refreshing...' : 'LIVE BUNDLES'}
                </span>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              </div>

              <div className="space-y-4">
                {teaserPlans.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${p.net === 'MTN' ? 'bg-yellow-500 text-black' :
                        p.net === 'Airtel' ? 'bg-red-500 text-white' :
                          'bg-green-500 text-black'
                        }`}>
                        {p.net[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{p.plan?.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{p.net}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-green-400">₦{p.plan?.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-[10px] text-gray-600 font-mono italic">Rates pulled from direct provider feeds</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Animated Background */}
      <AnimatedBackgroundWrapper />
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-black/90 backdrop-blur-xl border-b border-white/10 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <LogoInline size="sm" />
            <div className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-sm text-gray-400 hover:text-white transition-colors">Services</a>
              <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild className="text-gray-300 hover:text-white hover:bg-white/10">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-[128px] animate-float" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-green-400/10 rounded-full blur-[100px] animate-float-delayed" />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-emerald-500/10 rounded-full blur-[120px] animate-float-slow" />

        <div className="container mx-auto relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-300">Trusted by 1,800+ Nigerians</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
              The Smarter Way to
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                Buy Airtime & Data
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Experience lightning-fast VTU services with unbeatable rates.
              Recharge any network, pay bills, and earn rewards.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="bg-green-500 hover:bg-green-400 text-black font-semibold px-8 h-14 text-lg" asChild>
                <Link href="/register">
                  Start for Free
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 h-14 text-lg" asChild>
                <Link href="#services">See How It Works</Link>
              </Button>
            </div>

            {/* Stats - More realistic figures */}
            <div className="flex items-center justify-center gap-6 md:gap-12 mb-12">
              <div className="text-center px-4">
                <p className="text-2xl md:text-3xl font-bold text-white">1.8K+</p>
                <p className="text-xs md:text-sm text-gray-500">Active Users</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center px-4">
                <p className="text-2xl md:text-3xl font-bold text-green-500">99.8%</p>
                <p className="text-xs md:text-sm text-gray-500">Uptime</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center px-4">
                <p className="text-2xl md:text-3xl font-bold text-white">500K+</p>
                <p className="text-xs md:text-sm text-gray-500">Transactions</p>
              </div>
            </div>

            {/* Live Transaction Ticker */}
            <div className="flex justify-center">
              <LiveTransactionTicker />
            </div>
          </div>
        </div>
      </section>

      {/* Networks Section */}
      <section className="py-12 px-6 border-y border-white/10 bg-white/[0.02]">
        <div className="container mx-auto">
          <p className="text-center text-sm text-gray-500 mb-6">All major networks supported</p>
          <div className="flex items-center justify-center gap-12 flex-wrap opacity-60">
            <div className="text-2xl font-bold text-yellow-500">MTN</div>
            <div className="text-2xl font-bold text-red-500">Airtel</div>
            <div className="text-2xl font-bold text-green-500">Glo</div>
            <div className="text-2xl font-bold text-green-400">9mobile</div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <p className="text-green-500 text-sm font-medium mb-3">SERVICES</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything You Need</h2>
            <p className="text-gray-400 max-w-xl mx-auto">One platform for all your VTU needs. Fast, reliable, and affordable.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Airtime */}
            <Link href="/register" className="group">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.06] hover:border-green-500/50 transition-all duration-300">
                <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-500/20 transition-colors">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Airtime</h3>
                <p className="text-gray-400 text-sm mb-4">Instant airtime top-up for all networks at the best rates.</p>
                <span className="text-green-500 text-sm font-medium group-hover:underline">Buy Now →</span>
              </div>
            </Link>

            {/* Data */}
            <Link href="/register" className="group">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.06] hover:border-green-500/50 transition-all duration-300">
                <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-500/20 transition-colors">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Data Bundles</h3>
                <p className="text-gray-400 text-sm mb-4">Affordable data plans for browsing, streaming, and more.</p>
                <span className="text-green-500 text-sm font-medium group-hover:underline">Buy Now →</span>
              </div>
            </Link>

            {/* Cable TV */}
            <Link href="/register" className="group">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.06] hover:border-green-500/50 transition-all duration-300">
                <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-500/20 transition-colors">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Cable TV</h3>
                <p className="text-gray-400 text-sm mb-4">Pay for DStv, GOtv, and Startimes subscriptions instantly.</p>
                <span className="text-green-500 text-sm font-medium group-hover:underline">Pay Now →</span>
              </div>
            </Link>

            {/* Electricity */}
            <Link href="/register" className="group">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.06] hover:border-green-500/50 transition-all duration-300">
                <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-500/20 transition-colors">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Electricity</h3>
                <p className="text-gray-400 text-sm mb-4">Buy prepaid and postpaid electricity tokens easily.</p>
                <span className="text-green-500 text-sm font-medium group-hover:underline">Pay Now →</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-gradient-to-b from-transparent via-green-500/5 to-transparent">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <p className="text-green-500 text-sm font-medium mb-3">WHY CHOOSE US</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Built for Speed & Trust</h2>
            <p className="text-gray-400 max-w-xl mx-auto">We&apos;ve designed every aspect of TADA VTU to give you the best experience.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Lightning Fast</h3>
              <p className="text-gray-400">Transactions complete in under 5 seconds. No waiting, no delays.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Bank-Level Security</h3>
              <p className="text-gray-400">Your data and transactions are protected with enterprise-grade encryption.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">24/7 Support</h3>
              <p className="text-gray-400">Our support team is always available to help you via WhatsApp.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section Teaser */}
      <PricingTeaser />

      {/* Testimonials */}
      <section className="py-24 px-6 bg-white/[0.02]">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <p className="text-green-500 text-sm font-medium mb-3">TESTIMONIALS</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Loved by Thousands</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 mb-4">&quot;TADA VTU is incredibly fast! I bought airtime and it was delivered in seconds. Best VTU platform I&apos;ve used.&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 font-semibold">A</div>
                <div>
                  <p className="text-white font-medium">Adebayo O.</p>
                  <p className="text-gray-500 text-sm">Lagos</p>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 mb-4">&quot;The referral program is amazing! I&apos;ve earned over ₦5,000 just by sharing with friends. Highly recommend!&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 font-semibold">C</div>
                <div>
                  <p className="text-white font-medium">Chioma N.</p>
                  <p className="text-gray-500 text-sm">Abuja</p>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 mb-4">&quot;Finally, a VTU app that works! Clean interface, fast transactions, and great customer support. 10/10!&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 font-semibold">E</div>
                <div>
                  <p className="text-white font-medium">Emmanuel K.</p>
                  <p className="text-gray-500 text-sm">Port Harcourt</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-12 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold text-black mb-4">Ready to Get Started?</h2>
              <p className="text-black/70 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of Nigerians who trust TADA VTU for their daily recharge needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-black hover:bg-gray-900 text-white font-semibold px-8 h-14 text-lg" asChild>
                  <Link href="/register">Create Free Account</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-black/30 text-black hover:bg-black/10 px-8 h-14 text-lg" asChild>
                  <Link href="/contact">Contact Sales</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <LogoInline size="sm" />
              <p className="text-gray-400 text-sm mt-4 max-w-xs">
                Nigeria&apos;s most trusted VTU platform for airtime, data, and bill payments.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/register" className="text-gray-400 hover:text-white transition-colors">Buy Airtime</Link></li>
                <li><Link href="/register" className="text-gray-400 hover:text-white transition-colors">Buy Data</Link></li>
                <li><Link href="/register" className="text-gray-400 hover:text-white transition-colors">Cable TV</Link></li>
                <li><Link href="/register" className="text-gray-400 hover:text-white transition-colors">Electricity</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/register" className="text-gray-400 hover:text-white transition-colors">Referral Program</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} TADA VTU. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm">
              Developed by <span className="text-green-500">Weetech (Jonah Mafuyai)</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
