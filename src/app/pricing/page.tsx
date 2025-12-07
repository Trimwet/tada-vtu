import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, X, Star, TrendingUp, Shield, Clock, Users, Award, Zap } from "lucide-react"
import Link from "next/link"

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for personal use",
      features: [
        { name: "Airtime Recharge", included: true },
        { name: "Data Bundle Purchase", included: true },
        { name: "Bill Payments", included: true },
        { name: "Basic Support", included: true },
        { name: "Transaction History", included: true },
        { name: "Bulk SMS", included: false },
        { name: "API Access", included: false },
        { name: "Priority Support", included: false }
      ],
      popular: false,
      cta: "Get Started Free"
    },
    {
      name: "Professional",
      price: "₦2,500",
      period: "/month",
      description: "Best for small businesses",
      features: [
        { name: "Everything in Starter", included: true },
        { name: "Bulk SMS", included: true },
        { name: "API Access", included: true },
        { name: "Priority Support", included: true },
        { name: "Advanced Analytics", included: true },
        { name: "Multi-User Access", included: true },
        { name: "Custom Branding", included: false },
        { name: "Dedicated Account Manager", included: false }
      ],
      popular: true,
      cta: "Start Professional Plan"
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations",
      features: [
        { name: "Everything in Professional", included: true },
        { name: "Custom Branding", included: true },
        { name: "Dedicated Account Manager", included: true },
        { name: "Custom Integrations", included: true },
        { name: "SLA Guarantee", included: true },
        { name: "Advanced Security", included: true },
        { name: "Unlimited Transactions", included: true },
        { name: "24/7 Phone Support", included: true }
      ],
      popular: false,
      cta: "Contact Sales"
    }
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <nav className="fixed top-0 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">TADA VTU</span>
            </div>
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
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-4 py-2 rounded-full mb-6">
              <Award className="h-4 w-4" />
              <span className="text-sm font-medium">Transparent Pricing</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Choose Your Perfect <span className="text-green-600 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Plan</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Whether you're an individual or a large enterprise, we have the perfect plan to power your VTU needs. 
              Get started free and upgrade anytime.
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>No Hidden Fees</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Cancel Anytime</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>14-Day Free Trial</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative border-2 transition-all duration-300 hover:shadow-2xl ${
                plan.popular 
                  ? 'border-green-600 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 scale-105' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-green-600'
              }`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-green-600">{plan.price}</span>
                    {plan.period && <span className="text-gray-600 dark:text-gray-400 ml-1">{plan.period}</span>}
                  </div>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center space-x-3">
                        {feature.included ? (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${
                          feature.included 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-600'
                        }`}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'border-green-600 text-green-600 hover:bg-green-50'
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/register">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-800/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Compare Plans Side by Side
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              See exactly what each plan includes to make the best choice for your needs
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left py-4 px-6 text-gray-900 dark:text-white font-semibold">Features</th>
                    <th className="text-center py-4 px-6 text-gray-900 dark:text-white font-semibold">Starter</th>
                    <th className="text-center py-4 px-6 text-green-600 font-semibold">Professional</th>
                    <th className="text-center py-4 px-6 text-gray-900 dark:text-white font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    'Unlimited Transactions',
                    'API Rate Limit',
                    'Transaction History',
                    'Email Support',
                    'Phone Support',
                    'Bulk Operations',
                    'Custom Reports',
                    'Priority Processing'
                  ].map((feature, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-4 px-6 text-gray-900 dark:text-white font-medium">{feature}</td>
                      <td className="py-4 px-6 text-center">
                        {index < 4 ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-400 mx-auto" />
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {index < 6 ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-400 mx-auto" />
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Everything you need to know about our pricing and plans
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                question: "Can I change plans anytime?",
                answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated."
              },
              {
                question: "Is there a free trial?",
                answer: "Absolutely! All paid plans come with a 14-day free trial. No credit card required to start."
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards, bank transfers, and mobile money payments. Enterprise customers can also request invoicing."
              },
              {
                question: "Are there any hidden fees?",
                answer: "No hidden fees! The price you see is the price you pay. Transaction fees are clearly displayed before each purchase."
              }
            ].map((faq, index) => (
              <Card key={index} className="border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 dark:text-gray-400">{faq.answer}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-green-100 mb-8">
              Join thousands of satisfied customers who trust TADA VTU for their mobile needs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="px-8 py-6 text-lg" asChild>
                <Link href="/register">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-green-600 px-8 py-6 text-lg" asChild>
                <Link href="/contact">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">TADA VTU</span>
              </div>
              <p className="text-gray-400 mb-4">
                Nigeria's most trusted VTU platform for airtime, data, and bill payments.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/buy-airtime" className="hover:text-white">Buy Airtime</Link></li>
                <li><Link href="/buy-data" className="hover:text-white">Buy Data</Link></li>
                <li><Link href="/pay-bills" className="hover:text-white">Pay Bills</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
                <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About Us</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 TADA VTU. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}