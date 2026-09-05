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
      {/* The nav used to live inside the hero frame's own inner scroll container below — that
          container's overflow-y-auto only ever fires if HeroContent overflows the frame itself
          (it doesn't, in practice), so the nav was never actually sticky against the page's real
          scroll: once a visitor scrolled past the hero into "How it works" etc., the whole frame
          — nav included — scrolled away with it. `fixed` takes the nav out of flow entirely and
          keeps it pinned regardless of which section is in view. The outer p-3/sm:p-4 here
          reproduces the same inset the root div below still gives the hero frame, so the nav
          sits at the identical spot on first paint; pointer-events are re-enabled only on the
          actual nav pill so the transparent margin around it doesn't block clicks through to the
          hero behind it. */}
      <div className="fixed inset-x-0 top-0 z-50 p-3 sm:p-4 pointer-events-none">
        <div className="pointer-events-auto">
          <MarketingNavbar />
        </div>
      </div>

      {/* Hero Frame (Convix Style with Video Background) */}
      <div className="relative z-10 w-full h-[calc(100vh-24px)] sm:h-[calc(100vh-32px)] overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl bg-sky-deep">

        {/* Background Video — self-hosted from public/hero.mp4. The original, pulled from an
            external CDN, was a 31.5MB 3328x2492 source displayed at well under 1300px wide; this
            is a re-encode (1920px, libx264 CRF 26, no audio track) at 3.8MB with no visible
            quality loss at the size it's actually shown — see the file history for the ffmpeg
            command if it ever needs redoing. */}
        <video
          src="/hero.mp4"
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

        {/* Foreground Content — pt-[98px] replaces the vertical space the in-flow navbar used to
            occupy here (measured from the live layout before it was pulled out above), so the
            headline sits at exactly the same spot on first paint. */}
        <div className="relative z-10 w-full h-full overflow-y-auto pb-12">
          <div id="main-content" className="pt-[98px]">
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
