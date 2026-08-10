import React from 'react';
import { Navbar } from '@/components/Navbar';
import { DashboardPreview } from '@/components/DashboardPreview';
import { ChevronRight } from 'lucide-react';

export default function ConvixHero() {
  return (
    <div className="min-h-screen w-full bg-[#ededed] p-3 sm:p-4 font-sans">
      <div className="relative w-full h-[calc(100vh-24px)] sm:h-[calc(100vh-32px)] overflow-hidden bg-[#d9d9d9] rounded-2xl sm:rounded-3xl">
        
        {/* Background Video */}
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disableRemotePlayback
          // @ts-ignore - for specific mobile browsers
          webkit-playsinline="true"
          x5-playsinline="true"
          poster="https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-white/10" />

        {/* Foreground Content */}
        <div className="relative z-10 w-full h-full overflow-y-auto">
          <Navbar />
          
          {/* Hero Content */}
          <div className="flex flex-col items-center px-4 pt-10 sm:pt-16 pb-8 sm:pb-12 text-center w-full">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 shadow-sm text-[13px] font-medium text-neutral-800">
              <div className="w-[7px] h-[7px] rounded-full bg-[#ef4d23]" />
              Convix Software
            </div>

            {/* Headline */}
            <h1 
              className="text-neutral-900 mt-5 sm:mt-6 max-w-4xl"
              style={{
                fontSize: 'clamp(36px, 8vw, 72px)',
                lineHeight: 1.05,
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              Shaping <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400 }}>Agencies</span> <br /> of tomorrow
            </h1>

            {/* Subtitle */}
            <p 
              className="mt-4 sm:mt-6 text-neutral-700 px-2"
              style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }}
            >
              The All-In-One Software Powering the Future of PR Agencies
            </p>

            {/* CTA */}
            <button className="mt-6 sm:mt-8 inline-flex items-center gap-3 bg-[#0b0f1a] text-white rounded-full pl-6 sm:pl-7 pr-2 py-2 sm:py-2.5 text-[14px] font-medium hover:bg-black transition-colors shadow-lg">
              Get Started
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/15 flex items-center justify-center">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>

          <DashboardPreview />
          
        </div>
      </div>
    </div>
  );
}
