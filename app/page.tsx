import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function MarketingHero() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#cfe4f2] text-ink selection:bg-sky-deep selection:text-white font-sans">
      {/* Full-bleed atmospheric background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Layered radial gradients */}
        <div 
          className="absolute inset-0 opacity-90"
          style={{ background: 'radial-gradient(120% 100% at 50% 0%, #cfe4f2 0%, #7cbcdc 100%)' }}
        />
        {/* Soft white mist patches */}
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-white/60 blur-[120px]" />
        <div className="absolute top-[20%] -right-[15%] w-[60%] h-[60%] rounded-full bg-white/40 blur-[140px]" />
      </div>

      {/* Floating pill navbar */}
      <nav className="relative z-10 pt-8 px-4 sm:px-6 flex justify-center w-full">
        <div className="flex items-center justify-between w-full max-w-5xl rounded-full bg-white/40 backdrop-blur-xl px-6 py-3 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] border border-white/60">
          {/* Logo */}
          <div className="flex items-center gap-2 font-serif italic text-[22px] font-medium tracking-tight text-ink">
            Invictus
          </div>
          
          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-[15px] font-medium text-slate">
            <Link href="#product" className="hover:text-ink transition-colors">Product</Link>
            <Link href="#solutions" className="hover:text-ink transition-colors">Solutions</Link>
            <Link href="#pricing" className="hover:text-ink transition-colors">Pricing</Link>
          </div>
          
          {/* CTA */}
          <div className="flex items-center gap-5">
            <Link href="/login" className="hidden sm:block text-[15px] font-medium text-slate hover:text-ink transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="rounded-full bg-ink text-white px-5 py-2 text-[15px] font-medium hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-md">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-28 pb-20 px-4 text-center max-w-5xl mx-auto">
        {/* Badge */}
        <div className="flex items-center gap-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white/60 px-4 py-1.5 shadow-sm mb-10">
          <div className="w-2 h-2 rounded-full bg-ink animate-pulse" />
          <span className="text-[13px] font-semibold text-ink tracking-tight">Now with AI-guided brand kits</span>
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(42px,6.5vw,72px)] font-medium leading-[1.05] tracking-[-0.03em] max-w-[850px] mb-6 text-ink">
          Win more deals with proposals that practically write <span className="font-serif italic font-normal text-ink">themselves.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[19px] text-slate max-w-[540px] mb-12 leading-[1.6]">
          Transform scattered notes into stunning, brand-aligned proposal packages in minutes, not hours.
        </p>

        {/* CTA Row */}
        <div className="flex flex-col sm:flex-row items-center gap-7 mb-24">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-full bg-ink text-white px-7 py-3.5 text-[17px] font-medium hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10 group">
            Start closing deals
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="#demo" className="text-[17px] font-medium text-slate hover:text-ink underline-offset-4 hover:underline transition-all">
            See how it works
          </Link>
        </div>

        {/* Glass Card Before/After */}
        <div className="w-full rounded-[32px] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="flex flex-col md:flex-row min-h-[400px]">
            {/* Before: Raw notes */}
            <div className="flex-1 p-10 md:p-12 border-b md:border-b-0 md:border-r border-white/40 text-left bg-white/10">
              <div className="flex items-center gap-2.5 mb-8 text-mist text-[13px] uppercase tracking-wider font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-mist" />
                Raw Brainstorming
              </div>
              <div className="font-mono text-[14px] leading-relaxed text-slate space-y-4 opacity-75">
                <p>client: acme corp</p>
                <p>budget around 50k</p>
                <p>need to redesign their core SaaS dashboard, current one is too clunky and users are churning</p>
                <p>timeline: 3 months max</p>
                <p>deliverables: UI components, design system, maybe some react code?</p>
              </div>
            </div>

            {/* After: Structured Proposal */}
            <div className="flex-[1.4] p-10 md:p-12 bg-white/60 text-left relative overflow-hidden">
              {/* Subtle background flair for the right side */}
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/80 rounded-full blur-[60px] pointer-events-none" />
              
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-2 text-ink text-[13px] uppercase tracking-wider font-semibold">
                    <Sparkles className="w-4 h-4 text-ink" />
                    Structured Package
                  </div>
                  <div className="px-3.5 py-1.5 bg-white rounded-full text-[11px] font-bold tracking-wide text-sky-deep shadow-sm">
                    Acme Corp
                  </div>
                </div>
                
                <div className="space-y-8 flex-1">
                  <div>
                    <h3 className="font-serif italic text-[32px] text-ink mb-3 leading-tight">Executive Summary</h3>
                    <p className="text-[15px] text-slate leading-[1.7] opacity-90">
                      Acme Corp requires a modernized SaaS dashboard to improve user retention. This proposal outlines a comprehensive 3-month strategy to deliver a scalable design system, optimized UI components, and seamless front-end integration.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/60 transition-transform hover:-translate-y-1">
                      <div className="text-[12px] text-mist font-semibold uppercase tracking-wider mb-1.5">Timeline</div>
                      <div className="font-medium text-[17px] text-ink">12 Weeks</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/60 transition-transform hover:-translate-y-1">
                      <div className="text-[12px] text-mist font-semibold uppercase tracking-wider mb-1.5">Investment</div>
                      <div className="font-medium text-[17px] text-ink">$50,000</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
