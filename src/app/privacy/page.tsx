import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogoInline } from "@/components/logo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/"><LogoInline size="sm" /></Link>
          <Button asChild variant="outline" size="sm"><Link href="/login">Sign In</Link></Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground">We collect information you provide directly:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Name and email address during registration</li>
              <li>Phone numbers for transactions</li>
              <li>Transaction history and preferences</li>
              <li>Device information for security purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">Your information is used to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Process your transactions</li>
              <li>Provide customer support</li>
              <li>Send transaction notifications</li>
              <li>Improve our services</li>
              <li>Prevent fraud and ensure security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Data Security</h2>
            <p className="text-muted-foreground">We implement industry-standard security measures including:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>SSL/TLS encryption for all data transmission</li>
              <li>Secure password hashing</li>
              <li>Transaction PIN protection</li>
              <li>Regular security audits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Sharing</h2>
            <p className="text-muted-foreground">We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Payment processors to complete transactions</li>
              <li>Service providers (network operators) to deliver services</li>
              <li>Law enforcement when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies</h2>
            <p className="text-muted-foreground">We use essential cookies to maintain your session and preferences. No third-party tracking cookies are used.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account</li>
              <li>Export your transaction history</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground">We retain your data for as long as your account is active. Transaction records are kept for 7 years for regulatory compliance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground">Our service is not intended for users under 18 years of age. We do not knowingly collect data from minors.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Contact Us</h2>
            <p className="text-muted-foreground">For privacy concerns, contact us at privacy@tadavtu.com or via WhatsApp.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/" className="text-green-500 hover:underline">← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
