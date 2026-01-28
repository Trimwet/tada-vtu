"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Lightning,
  MagnifyingGlass,
  Crown,
  WifiHigh,
  Info
} from "@phosphor-icons/react"
import Link from "next/link"
import { useAllDataPlans } from "@/hooks/useDataPlans"
import { LogoInline } from "@/components/logo"
import { AnimatedBackgroundWrapper } from "@/components/animated-background-wrapper"

export default function PricingPage() {
  const { plans, loading, error } = useAllDataPlans()
  const [activeNetwork, setActiveNetwork] = useState<string>("MTN")
  const [searchQuery, setSearchQuery] = useState("")

  const networks = ["MTN", "AIRTEL", "GLO", "9MOBILE"]

  const filteredPlans = (plans[activeNetwork] || []).filter(plan =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const tiers = [
    { name: "Bronze", spend: "₦0 - ₦9,999", color: "text-orange-400", bg: "bg-orange-400/10" },
    { name: "Silver", spend: "₦10k - ₦49,999", color: "text-gray-300", bg: "bg-gray-300/10" },
    { name: "Gold", spend: "₦50k - ₦199,999", color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { name: "Platinum", spend: "₦200k+", color: "text-cyan-400", bg: "bg-cyan-400/10" },
  ]

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col">
      <AnimatedBackgroundWrapper />

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-black/90 backdrop-blur-xl border-b border-white/10 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <LogoInline size="sm" />
            </Link>
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

      <main className="flex-grow pt-32 pb-20 px-6 relative">
        <div className="container mx-auto">
          {/* Hero Header */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <Badge variant="outline" className="mb-4 border-green-500/50 text-green-400 py-1.5 px-4 rounded-full bg-green-500/5">
              <Lightning weight="fill" className="mr-2" />
              Live Pricing Engine
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Best Rates for <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">Every Network</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              We aggregate the cheapest data plans in Nigeria. Check real-time prices and save more on your daily sub.
            </p>
          </div>

          {/* Loyalty Tiers */}
          <section className="mb-20">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                <Crown className="text-yellow-400" />
                Loyalty Pricing Tiers
              </h2>
              <p className="text-gray-500 text-sm mt-1">Spend more to unlock even cheaper custom rates!</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {tiers.map((tier) => (
                <div key={tier.name} className={`${tier.bg} border border-white/5 rounded-2xl p-5 text-center hover:border-white/20 transition-all`}>
                  <p className={`text-xl font-bold ${tier.color} mb-1`}>{tier.name}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-widest">{tier.spend}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing Explorer */}
          <div className="max-w-6xl mx-auto">
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm">
              {/* Toolbar */}
              <div className="p-6 border-b border-white/10 bg-white/5 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex bg-black/50 p-1 rounded-xl border border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
                  {networks.map((net) => (
                    <button
                      key={net}
                      onClick={() => setActiveNetwork(net)}
                      className={`flex-1 md:flex-none py-2 px-2 md:px-6 rounded-lg text-[11px] md:text-sm font-bold whitespace-nowrap transition-all ${activeNetwork === net
                        ? 'bg-green-500 text-black shadow-lg shadow-green-500/20'
                        : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
                <div className="relative w-full md:w-80">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search plans (e.g. 1GB)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-black/50 border-white/10 h-11 rounded-xl focus:ring-green-500/50"
                  />
                </div>
              </div>

              {/* Plans Table/Grid */}
              <div className="p-6 min-h-[400px]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm animate-pulse">Fetching live rates from networks...</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Info size={40} className="text-red-500 mb-4" />
                    <p className="text-red-400 font-medium">{error}</p>
                    <Button onClick={() => window.location.reload()} variant="link" className="text-green-500 mt-2">Try Again</Button>
                  </div>
                ) : filteredPlans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <MagnifyingGlass size={40} className="text-gray-600 mb-4" />
                    <p className="text-gray-500">No plans found matching &quot;{searchQuery}&quot;</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPlans.map((plan) => (
                      <Card key={plan.id} className="bg-black/40 border-white/5 hover:border-green-500/30 transition-all group">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start">
                            <Badge className="bg-white/10 text-gray-400 hover:bg-white/20 border-none px-2 py-0 text-[10px] uppercase font-bold tracking-wider">
                              {plan.type}
                            </Badge>
                            <span className="text-xs text-green-500/60 font-mono tracking-tighter">
                              {plan.validity}
                            </span>
                          </div>
                          <CardTitle className="text-lg mt-2 group-hover:text-green-400 transition-colors">
                            {plan.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-bold text-white">₦{plan.price.toLocaleString()}</span>
                          </div>
                          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <WifiHigh weight="bold" />
                              <span>{plan.size} Bundle</span>
                            </div>
                            <Button size="sm" className="h-8 px-3 bg-white/5 hover:bg-green-500 hover:text-black text-xs font-bold transition-all rounded-lg" asChild>
                              <Link href="/register">Buy Now</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Note */}
              <div className="p-4 bg-green-500/5 text-center border-t border-white/10">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
                  Prices updated 5 minutes ago • All plans include 24/7 priority delivery
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 bg-black relative z-10">
        <div className="container mx-auto text-center">
          <LogoInline size="sm" className="opacity-50 grayscale hover:grayscale-0 transition-all" />
          <p className="text-gray-600 text-sm mt-4">
            © {new Date().getFullYear()} TADA VTU. Empowering your digital lifestyle.
          </p>
        </div>
      </footer>
    </div>
  )
}