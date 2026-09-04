import { MarketingNavbar } from '@/components/MarketingNavbar';
import { HeroContent } from '@/components/HeroContent';
import { HowItWorks } from '@/components/HowItWorks';
import { Features } from '@/components/Features';
import { Pricing } from '@/components/Pricing';
import { Footer } from '@/components/Footer';

export default function MarketingHero() {
  return (
    <div 
      className="min-h-screen w-full text-ink selection:bg-sky-deep selection:text-white p-3 sm:p-4 bg-white" 
      style={{ 
        fontFamily: 'var(--font-inter-tight), sans-serif'
      }}
    >
      {/* Hero Frame (Convix Style with Video Background) */}
      <div className="relative z-10 w-full h-[calc(100vh-24px)] sm:h-[calc(100vh-32px)] overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl bg-sky-deep">
        
        {/* Background Video */}
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          disableRemotePlayback
          // @ts-ignore
          webkit-playsinline="true"
          x5-playsinline="true"
          poster="https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />

        {/* Foreground Content */}
        <div className="relative z-10 w-full h-full overflow-y-auto pb-12">
          <MarketingNavbar />
          <div id="main-content">
            <HeroContent />
          </div>
        </div>
      </div>

      {/* Rest of the Page Content */}
      <div 
        className="relative z-0 -mt-10 pt-20 -mx-3 sm:-mx-4 px-3 sm:px-4"
        style={{
          background: 'linear-gradient(180deg, #cfe4f2 0%, #ffffff 50%, #ffffff 100%)'
        }}
      >
        <HowItWorks />
        <Features />
        <Pricing />
        <Footer />
      </div>
    </div>
  );
}
