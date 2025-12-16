import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogoInline } from "@/components/logo";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/"><LogoInline size="sm" /></Link>
          <Button asChild variant="outline" size="sm"><Link href="/login">Sign In</Link></Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">By accessing and using TADA VTU (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground">TADA VTU provides virtual top-up (VTU) services including but not limited to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Airtime recharge for all Nigerian networks</li>
              <li>Data bundle purchases</li>
              <li>Cable TV subscription payments</li>
              <li>Electricity bill payments</li>
              <li>Betting account funding</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground">To use our services, you must create an account with accurate information. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Payments and Refunds</h2>
            <p className="text-muted-foreground">All payments are processed securely through our payment partners. Refunds are only issued for failed transactions where the service was not delivered. Successful transactions cannot be reversed.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Transaction PIN</h2>
            <p className="text-muted-foreground">You are required to set up a 4-digit transaction PIN for security. This PIN is required for all purchases. Never share your PIN with anyone. TADA VTU will never ask for your PIN.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Prohibited Activities</h2>
            <p className="text-muted-foreground">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Use the service for any illegal purposes</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use automated systems to access the service</li>
              <li>Engage in fraudulent activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">TADA VTU is not liable for any indirect, incidental, or consequential damages arising from your use of the service. Our liability is limited to the amount of the transaction in question.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Changes to Terms</h2>
            <p className="text-muted-foreground">We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Contact</h2>
            <p className="text-muted-foreground">For questions about these terms, contact us via WhatsApp or email at support@tadavtu.com</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/" className="text-green-500 hover:underline">← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
