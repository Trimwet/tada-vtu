"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Phone, 
  Envelope, 
  MapPin, 
  Clock, 
  ChatCircle, 
  PaperPlaneTilt, 
  Shield, 
  Users, 
  Trophy,
  CheckCircle,
  Lightning,
  Star
} from "@phosphor-icons/react"
import Link from "next/link"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <nav className="fixed top-0 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Lightning size={20} className="text-white" />
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
              <ChatCircle size={16} />
              <span className="text-sm font-medium">We're Here to Help</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Get in <span className="text-green-600 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Touch</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Have questions about our services? Our friendly support team is available 24/7 to assist you. 
              Reach out and experience our award-winning customer service.
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} className="text-green-600" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} className="text-green-600" />
                <span>Response in Minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} className="text-green-600" />
                <span>100% Satisfaction</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone size={32} className="text-green-600" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">Phone Support</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Speak with our experts</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">0800-TADA-VTU</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Available 24/7</p>
                <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
                  <Link href="tel:0800-TADA-VTU">Call Now</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Envelope size={32} className="text-blue-600" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">Email Support</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Get detailed responses</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">support@tadavtu.com</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Response within 30 minutes</p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                  <Link href="mailto:support@tadavtu.com">Send Email</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChatCircle size={32} className="text-purple-600" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">Live Chat</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Instant assistance</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Chat with Us</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Available during business hours</p>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Start Chat
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin size={32} className="text-orange-600" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">Visit Us</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Our office location</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Lagos, Nigeria</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Mon-Fri: 9AM-5PM</p>
                <Button className="w-full bg-orange-600 hover:bg-orange-700">
                  Get Directions
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-800/30">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Send Us a Message
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Fill out the form below and we'll get back to you within 30 minutes
              </p>
            </div>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl text-gray-900 dark:text-white">Get in Touch</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Tell us how we can help you today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="firstName" className="text-gray-700 dark:text-gray-300">First Name</Label>
                      <Input 
                        id="firstName" 
                        placeholder="John" 
                        className="border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-gray-700 dark:text-gray-300">Last Name</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Doe" 
                        className="border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="john@example.com" 
                      className="border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">Phone Number</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="+234 801 234 5678" 
                      className="border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="subject" className="text-gray-700 dark:text-gray-300">Subject</Label>
                    <Input 
                      id="subject" 
                      placeholder="How can we help you?" 
                      className="border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message" className="text-gray-700 dark:text-gray-300">Message</Label>
                    <Textarea 
                      id="message" 
                      placeholder="Tell us more about your inquiry..." 
                      rows={6}
                      className="border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3">
                    <PaperPlaneTilt size={16} className="mr-2" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
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
              Common questions about our services and support
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                question: "What are your support hours?",
                answer: "We provide 24/7 customer support via phone, email, and live chat. Our physical office is open Monday to Friday, 9 AM to 5 PM."
              },
              {
                question: "How quickly do you respond to inquiries?",
                answer: "We respond to phone calls immediately, emails within 30 minutes, and live chat within 2 minutes during business hours."
              },
              {
                question: "Do you offer technical support?",
                answer: "Yes, our technical support team can help with API integration, account setup, and any technical issues you may encounter."
              },
              {
                question: "Can I get a dedicated account manager?",
                answer: "Dedicated account managers are available for Professional and Enterprise plan customers."
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

      {/* Trust Indicators */}
      <section className="py-16 px-4 bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
              Why Customers Trust Our Support
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Lightning Fast</h3>
                <p className="text-green-100">Average response time under 2 minutes</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Expert Team</h3>
                <p className="text-green-100">Certified professionals ready to help</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Award Winning</h3>
                <p className="text-green-100">Rated 4.9/5 by 50,000+ customers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Experience Exceptional Support?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Join thousands of satisfied customers who trust TADA VTU for their mobile needs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg" asChild>
                <Link href="/register">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 px-8 py-6 text-lg" asChild>
                <Link href="/pricing">View Pricing</Link>
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
                  <Lightning size={20} className="text-white" />
                </div>
                <span className="text-xl font-bold">TADA VTU</span>
              </div>
              <p className="text-gray-400 mb-4">
                Nigeria's most trusted VTU platform for airtime, data, and bill payments.
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Star size={16} />
                <span>Rated 4.9/5 by customers</span>
              </div>
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