import { Logo } from "@/components/ui/logo";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center flex-wrap gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2" data-testid="text-terms-heading">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-8" data-testid="text-terms-updated">Last updated: February 9, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed">
              By accessing or using the Learnpro AI platform ("Service") available at learnproai.in, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and Learnpro AI.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">2. Description of Service</h2>
            <p className="text-sm leading-relaxed">
              Learnpro AI is an AI-powered educational platform designed to assist users in preparing for UPSC Civil Services Examination and State Public Service Commission (PSC) exams. The Service includes, but is not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed mt-2">
              <li>AI-powered chat assistance for exam-related queries and study guidance.</li>
              <li>Daily current affairs digests with exam-relevant categorization.</li>
              <li>Practice quizzes with AI-generated questions tailored to specific exams.</li>
              <li>Answer sheet evaluation with detailed scoring and feedback.</li>
              <li>Note-taking tools with spaced repetition for effective revision.</li>
              <li>Study planner with AI-generated timetables, goal tracking, and syllabus progress monitoring.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">3. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
              <li>You may register using your mobile number (via OTP verification) or Google Sign-In. Each user is permitted one account.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms or are used for fraudulent purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">4. AI-Generated Content Disclaimer</h2>
            <p className="text-sm leading-relaxed">
              The Service utilizes artificial intelligence to generate educational content, including but not limited to chat responses, quiz questions, answer evaluations, current affairs summaries, and study plans. You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed mt-2">
              <li>AI-generated content is provided for educational and informational purposes only and may contain inaccuracies or errors.</li>
              <li>AI responses should not be treated as authoritative or definitive answers. Always cross-reference with official sources and standard textbooks.</li>
              <li>Answer evaluations and scores are AI-estimated and may not reflect actual exam grading standards.</li>
              <li>Learnpro AI is not responsible for any decisions made based on AI-generated content.</li>
              <li>The quality and accuracy of AI responses may vary and are continuously being improved.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">5. Acceptable Use</h2>
            <p className="text-sm leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed mt-2">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws or regulations.</li>
              <li>Attempt to gain unauthorized access to the Service, other user accounts, or our systems.</li>
              <li>Upload malicious files, viruses, or content that could harm the platform or other users.</li>
              <li>Use automated systems (bots, scrapers) to access the Service without our explicit permission.</li>
              <li>Share, redistribute, or commercially exploit content generated by the Service without authorization.</li>
              <li>Misrepresent your identity or impersonate another person.</li>
              <li>Engage in any activity that disrupts or interferes with the Service's functionality.</li>
              <li>Use the Service to generate content that is harmful, offensive, or violates the rights of others.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">6. Intellectual Property</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
              <li>The Learnpro AI platform, including its design, features, branding, and underlying technology, is owned by Learnpro AI and protected by intellectual property laws.</li>
              <li>Content you create (notes, uploaded documents) remains your property. By uploading content, you grant us a limited license to process it for providing the Service.</li>
              <li>AI-generated content provided through the Service may be used by you for personal educational purposes only.</li>
              <li>You may not copy, modify, distribute, or create derivative works from our platform or its content without our written consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">7. Subscription & Payments</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
              <li>Certain features of the Service may be offered under free or paid subscription plans.</li>
              <li>Free accounts may be subject to usage limits, including daily query limits for AI features.</li>
              <li>Paid subscriptions are billed according to the plan selected at the time of purchase.</li>
              <li>Prices are subject to change with prior notice. Existing subscriptions will be honored at the original price until renewal.</li>
              <li>Refund policies, if applicable, will be clearly stated at the time of purchase.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">8. Service Availability</h2>
            <p className="text-sm leading-relaxed">
              We strive to maintain continuous availability of the Service but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We shall not be liable for any loss or inconvenience arising from service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">9. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed">
              To the maximum extent permitted by law, Learnpro AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to loss of data, loss of opportunity, or exam results. Our total liability for any claim related to the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">10. Indemnification</h2>
            <p className="text-sm leading-relaxed">
              You agree to indemnify and hold harmless Learnpro AI, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Service, your violation of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">11. Termination</h2>
            <p className="text-sm leading-relaxed">
              We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice. You may also terminate your account at any time by contacting us. Upon termination, your right to use the Service ceases immediately. Provisions of these Terms that by their nature should survive termination shall remain in effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">12. Governing Law</h2>
            <p className="text-sm leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts in New Delhi, India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">13. Changes to Terms</h2>
            <p className="text-sm leading-relaxed">
              We reserve the right to modify these Terms at any time. Material changes will be communicated through the platform or via email. Your continued use of the Service after changes are posted constitutes your acceptance of the revised Terms. We encourage you to review these Terms periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">14. Contact Information</h2>
            <p className="text-sm leading-relaxed">
              For any questions or concerns regarding these Terms of Service, please contact us at:
            </p>
            <div className="mt-2 text-sm leading-relaxed">
              <p className="font-medium text-foreground">Learnpro AI</p>
              <p>Email: support@learnproai.in</p>
              <p>Website: learnproai.in</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
