import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer 
      className="w-full relative z-10 pt-20 pb-8 px-8 sm:px-12 mt-24 mb-0 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden"
      style={{
        background: `
          linear-gradient(90deg, rgba(207,228,242,0.9) 0%, rgba(124,188,220,0.85) 100%),
          url('https://images.unsplash.com/photo-1509803874385-db7c23652552?q=80&w=2000&auto=format&fit=crop')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-12 mb-16">
        
        {/* Logo/Brand */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="Marg Logo" className="h-7 w-auto object-contain mix-blend-multiply" />
            <div className="font-serif italic text-[24px] font-medium tracking-tight text-ink">
              Marg
            </div>
          </div>
          <p className="text-slate text-[14px] max-w-[200px]">
            Proposals that practically write themselves.
          </p>
        </div>

        {/* Links Columns */}
        <div className="flex gap-12 sm:gap-24">
          <div className="flex flex-col gap-3">
            <h4 className="text-ink font-semibold text-[14px] mb-2">Product</h4>
            <Link href="#features" className="text-slate text-[14px] hover:text-ink transition-colors">Features</Link>
            <Link href="#pricing" className="text-slate text-[14px] hover:text-ink transition-colors">Pricing</Link>
            <Link href="#" className="text-slate text-[14px] hover:text-ink transition-colors">Templates</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            <h4 className="text-ink font-semibold text-[14px] mb-2">Company</h4>
            <Link href="#" className="text-slate text-[14px] hover:text-ink transition-colors">About</Link>
            <Link href="#" className="text-slate text-[14px] hover:text-ink transition-colors">Contact</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            <h4 className="text-ink font-semibold text-[14px] mb-2">Legal</h4>
            <Link href="#" className="text-slate text-[14px] hover:text-ink transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-slate text-[14px] hover:text-ink transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-[rgba(23,23,23,0.1)]">
        <div className="text-slate text-[13px]">
          © 2026 Marg
        </div>
        <div className="text-slate text-[13px] font-medium tracking-wide">
          Made in India
        </div>
      </div>
    </footer>
  );
}
