import { Logo } from "@/components/ui/logo";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2" data-testid="text-privacy-heading">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8" data-testid="text-privacy-updated">Last updated: February 9, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">1. Introduction</h2>
            <p className="text-sm leading-relaxed">
              Learnpro AI ("we," "our," or "us") operates the Learnpro AI platform accessible at learnproai.in. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our AI-powered exam preparation platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">2. Information We Collect</h2>
            <h3 className="text-base font-medium mb-2 text-foreground">2.1 Information You Provide</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
              <li>Account information: name, email address, phone number, and profile photo when you register via mobile OTP or Google Sign-In.</li>
              <li>Exam preferences: target exams (UPSC, State PSC), optional subjects, preparation stage, and study schedule preferences during onboarding.</li>
              <li>User-generated content: chat messages, notes, uploaded answer sheets, question papers, and study materials.</li>
              <li>Feedback and communications: any messages or feedback you send to us directly.</li>
            </ul>

            <h3 className="text-base font-medium mb-2 mt-4 text-foreground">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
              <li>Usage data: features accessed, quiz scores, study planner activity, time spent on the platform, and interaction patterns.</li>
              <li>Device information: browser type, operating system, screen resolution, and device identifiers.</li>
              <li>Log data: IP address, access times, pages viewed, and referring URLs.</li>
              <li>Cookies and similar technologies: session cookies for authentication and preference storage.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
              <li>To provide and personalize our AI-powered exam preparation services, including chat responses, quiz generation, answer evaluation, current affairs digests, and study planning.</li>
              <li>To authenticate your identity and maintain your account security.</li>
              <li>To track your preparation progress and generate performance analytics.</li>
              <li>To improve our AI models and the overall quality of our platform.</li>
              <li>To send you relevant notifications about your study goals, new features, and platform updates (with your consent).</li>
              <li>To comply with legal obligations and enforce our terms of service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">4. AI-Powered Features & Data Processing</h2>
            <p className="text-sm leading-relaxed">
              Our platform uses Google Gemini AI to power features such as AI Chat, quiz generation, answer evaluation, current affairs summarization, and study plan creation. When you interact with these features, your inputs (including text messages and uploaded documents) are processed by the AI model to generate responses. We do not use your personal data to train third-party AI models. AI-generated content is provided for educational purposes and should not be considered as a substitute for official study materials or expert guidance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">5. Data Storage & Security</h2>
            <p className="text-sm leading-relaxed">
              Your data is stored securely on cloud infrastructure with encryption at rest and in transit. We use industry-standard security measures including secure session management, encrypted communications (HTTPS/TLS), and access controls. Uploaded files such as answer sheets are stored in secure cloud object storage with restricted access. While we strive to protect your information, no method of electronic transmission or storage is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">6. Data Sharing & Disclosure</h2>
            <p className="text-sm leading-relaxed">We do not sell your personal information. We may share your data only in the following circumstances:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed mt-2">
              <li>With service providers who assist in operating our platform (cloud hosting, SMS delivery for OTP, AI processing), under strict confidentiality agreements.</li>
              <li>When required by law, legal process, or governmental request.</li>
              <li>To protect the rights, property, or safety of Learnpro AI, our users, or the public.</li>
              <li>In connection with a merger, acquisition, or sale of assets (with prior notice).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">7. Your Rights & Choices</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
              <li>Access and update your personal information through your account settings at any time.</li>
              <li>Request deletion of your account and associated data by contacting us.</li>
              <li>Opt out of non-essential notifications through your notification settings.</li>
              <li>Request a copy of your personal data in a portable format.</li>
              <li>Withdraw consent for data processing where consent is the legal basis.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">8. Children's Privacy</h2>
            <p className="text-sm leading-relaxed">
              Our platform is intended for users who are 16 years of age or older. We do not knowingly collect personal information from children under 16. If we become aware that we have collected data from a child under 16, we will take steps to delete such information promptly. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">9. Third-Party Links</h2>
            <p className="text-sm leading-relaxed">
              Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these external sites. We encourage you to review the privacy policies of any third-party services before providing your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">10. Changes to This Policy</h2>
            <p className="text-sm leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of any material changes by posting the updated policy on our platform with a revised "Last updated" date. Your continued use of the platform after any changes constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">11. Contact Us</h2>
            <p className="text-sm leading-relaxed">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
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
