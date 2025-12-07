import { Button } from "@/components/ui/button";
import { Phone, Wifi, Zap, Shield, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { LogoInline } from "@/components/logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <LogoInline size="sm" />
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild className="hover:text-green-600">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-900 dark:to-green-950">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Instant <span className="text-green-600">Airtime & Data</span>
              <br />At Your Fingertips
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Fast, reliable VTU services with the best rates. Recharge airtime, buy data, and pay bills in seconds.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg shadow-lg" asChild>
                <Link href="/register">
                  <Phone className="mr-2 h-5 w-5" />
                  Buy Airtime
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 px-8 py-6 text-lg" asChild>
                <Link href="/register">
                  <Wifi className="mr-2 h-5 w-5" />
                  Buy Data
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-center flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Instant Delivery</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Secure Payments</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Our Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Link href="/register" className="group">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center hover:shadow-lg hover:border-green-500/50 transition-all">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500 transition-colors">
                  <Phone className="h-7 w-7 text-green-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Airtime</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">All networks supported</p>
              </div>
            </Link>

            <Link href="/register" className="group">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center hover:shadow-lg hover:border-green-500/50 transition-all">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500 transition-colors">
                  <Wifi className="h-7 w-7 text-green-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data Bundles</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Affordable data plans</p>
              </div>
            </Link>

            <Link href="/register" className="group">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center hover:shadow-lg hover:border-green-500/50 transition-all">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500 transition-colors">
                  <Zap className="h-7 w-7 text-green-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Pay Bills</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Electricity, Cable TV & more</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-800/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">Lightning Fast</h3>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">Secure</h3>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">24/7 Support</h3>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">All Networks</h3>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-green-100 mb-8">
            Join thousands of satisfied customers today
          </p>
          <Button size="lg" variant="secondary" className="px-8" asChild>
            <Link href="/register">Create Free Account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <LogoInline size="sm" />
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <Link href="/register" className="hover:text-white">Buy Airtime</Link>
              <Link href="/register" className="hover:text-white">Buy Data</Link>
              <Link href="/register" className="hover:text-white">Pay Bills</Link>
              <Link href="/contact" className="hover:text-white">Contact</Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; {new Date().getFullYear()} TADA VTU. All rights reserved.</p>
            <p className="mt-2">Developed by Weetech (Jonah Mafuyai)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
