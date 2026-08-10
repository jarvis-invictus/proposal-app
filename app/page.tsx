import { MarketingNavbar } from '@/components/MarketingNavbar';
import { HeroContent } from '@/components/HeroContent';
import { HowItWorks } from '@/components/HowItWorks';
import { Features } from '@/components/Features';
import { Testimonials } from '@/components/Testimonials';
import { Pricing } from '@/components/Pricing';
import { Footer } from '@/components/Footer';

export default function MarketingHero() {
  return (
    <div className="min-h-screen w-full text-ink selection:bg-sky-deep selection:text-white" style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}>
      <div 
        className="relative w-full min-h-screen overflow-hidden rounded-none"
        style={{
          background: `
            radial-gradient(ellipse 90% 60% at 50% 0%, rgba(255,255,255,0.9), transparent 55%),
            radial-gradient(ellipse 70% 50% at 15% 30%, rgba(255,255,255,0.75), transparent 50%),
            radial-gradient(ellipse 60% 45% at 85% 20%, rgba(255,255,255,0.6), transparent 50%),
            linear-gradient(180deg, #cfe4f2 0%, #a9cbe6 40%, #8fb9dc 75%, #7cbcdc 100%)
          `
        }}
      >
        <MarketingNavbar />
        <HeroContent />
        <HowItWorks />
        <Features />
        <Testimonials />
        <Pricing />
        <Footer />
      </div>
    </div>
  );
}
