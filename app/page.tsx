import { MarketingNavbar } from '@/components/MarketingNavbar';
import { HeroContent } from '@/components/HeroContent';

export default function MarketingHero() {
  return (
    <div className="min-h-screen w-full" style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}>
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
      </div>
    </div>
  );
}
