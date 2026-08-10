import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function MarketingHero() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-sky-light text-ink selection:bg-sky-deep selection:text-white">
      {/* Full-bleed atmospheric background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Layered radial gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-sky-light)_0%,_var(--color-sky-deep)_100%)] opacity-80" />
        {/* Soft white mist patches */}
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-white/40 blur-[120px]" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-white/30 blur-[100px]" />
      </div>

      {/* Floating pill navbar */}
      <nav className="relative z-10 pt-6 px-4 sm:px-6 flex justify-center w-full">
        <div className="flex items-center justify-between w-full max-w-5xl rounded-full bg-glass-white backdrop-blur-md px-6 py-3 shadow-sm border border-white/40">
          {/* Logo */}
          <div className="flex items-center gap-2 font-serif italic text-2xl font-bold tracking-tight">
            Invictus
          </div>
          
          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate">
            <Link href="#product" className="hover:text-ink transition-colors">Product</Link>
            <Link href="#solutions" className="hover:text-ink transition-colors">Solutions</Link>
            <Link href="#pricing" className="hover:text-ink transition-colors">Pricing</Link>
          </div>
          
          {/* CTA */}
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-slate hover:text-ink transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="rounded-full bg-ink text-white px-5 py-2 text-sm font-medium hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-md">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-24 pb-16 px-4 text-center max-w-6xl mx-auto">
        {/* Badge */}
        <div className="flex items-center gap-2 rounded-full bg-glass-white backdrop-blur-md border border-white/50 px-4 py-1.5 shadow-sm mb-8">
          <div className="w-2 h-2 rounded-full bg-ink animate-pulse" />
          <span className="text-sm font-medium text-ink">Now with AI-guided brand kits</span>
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(36px,6vw,62px)] font-medium leading-[1.1] tracking-[-0.02em] max-w-4xl mb-6">
          Win more deals with proposals that practically write <span className="font-serif italic font-normal">themselves</span>.
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-slate max-w-[480px] mb-10 leading-relaxed">
          Transform scattered notes into stunning, brand-aligned proposal packages in minutes, not hours.
        </p>

        {/* CTA Row */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-20">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-full bg-ink text-white px-8 py-3.5 text-base font-medium hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg group">
            Start closing deals
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="#demo" className="text-base font-medium text-slate hover:text-ink underline-offset-4 hover:underline transition-all">
            See how it works
          </Link>
        </div>

        {/* Glass Card Before/After */}
        <div className="w-full max-w-5xl rounded-3xl bg-glass-white backdrop-blur-[18px] border border-white/60 shadow-xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Before: Raw notes */}
            <div className="flex-1 p-8 md:p-10 border-b md:border-b-0 md:border-r border-white/30 text-left">
              <div className="flex items-center gap-2 mb-6 text-mist text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-mist" />
                Raw Brainstorming
              </div>
              <div className="font-mono text-sm text-slate space-y-3 opacity-80">
                <p>client: acme corp</p>
                <p>budget around 50k</p>
                <p>need to redesign their core SaaS dashboard, current one is too clunky and users are churning</p>
                <p>timeline: 3 months max</p>
                <p>deliverables: UI components, design system, maybe some react code?</p>
              </div>
            </div>

            {/* After: Structured Proposal */}
            <div className="flex-[1.5] p-8 md:p-10 bg-white/40 text-left relative overflow-hidden">
              {/* Subtle background flair for the right side */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 rounded-full blur-[60px] pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-ink text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-ink" />
                    Structured Package
                  </div>
                  <div className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-sky-deep shadow-sm">
                    Acme Corp
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-serif italic text-2xl text-ink mb-2">Executive Summary</h3>
                    <p className="text-sm text-slate leading-relaxed">
                      Acme Corp requires a modernized SaaS dashboard to improve user retention. This proposal outlines a comprehensive 3-month strategy to deliver a scalable design system, optimized UI components, and front-end integration.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 rounded-xl p-4 shadow-sm border border-white/50">
                      <div className="text-xs text-mist font-medium mb-1">Timeline</div>
                      <div className="font-medium text-ink">12 Weeks</div>
                    </div>
                    <div className="bg-white/60 rounded-xl p-4 shadow-sm border border-white/50">
                      <div className="text-xs text-mist font-medium mb-1">Investment</div>
                      <div className="font-medium text-ink">$50,000</div>
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
