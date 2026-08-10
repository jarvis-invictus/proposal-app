import Link from 'next/link';
import { Menu } from 'lucide-react';

export function MarketingNavbar() {
  return (
    <div className="flex justify-center pt-5 sm:pt-6 px-3 sm:px-4 w-full relative z-10">
      <nav 
        className="flex items-center justify-between w-full max-w-[720px]"
        style={{
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.5)',
          borderRadius: '999px',
          padding: '10px 12px 10px 22px'
        }}
      >
        {/* Logo */}
        <div 
          className="text-[#171717]"
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: '20px'
          }}
        >
          Invictus
        </div>
        
        {/* Desktop Links */}
        <div className="hidden md:flex items-center" style={{ gap: '22px' }}>
          <Link href="#product" style={{ fontSize: '14px', color: '#52584c' }}>Product</Link>
          <Link href="#solutions" style={{ fontSize: '14px', color: '#52584c' }}>Solutions</Link>
          <Link href="#pricing" style={{ fontSize: '14px', color: '#52584c' }}>Pricing</Link>
        </div>
        
        {/* Right Cluster / CTA */}
        <div className="hidden md:block">
          <Link 
            href="/signup" 
            style={{
              display: 'inline-block',
              background: '#171717',
              color: 'white',
              borderRadius: '999px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            Start Free
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center pr-2">
          <button className="text-[#171717]">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>
    </div>
  );
}
