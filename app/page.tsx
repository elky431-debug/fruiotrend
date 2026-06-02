import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { Navbar } from "@/components/landing/Navbar";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import "./landing.css";

export default function HomePage() {
  return (
    <div className="landing-root">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <SocialProofSection />
      <TestimonialsSection />
      <ComparisonSection />

      <PricingSection />

      <FAQSection />

      <FinalCTASection />

      <footer
        style={{
          borderTop: "1px solid rgba(255, 92, 157, 0.14)",
          padding: "2rem 1rem",
          textAlign: "center",
          fontSize: 13,
          color: "#7a6f64",
        }}
      >
        PubMoi.io — 2026
      </footer>
    </div>
  );
}
