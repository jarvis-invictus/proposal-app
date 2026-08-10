import React from 'react';
import { Palette, LayoutTemplate, Sparkles, IndianRupee } from 'lucide-react';

const cardStyle = {
  background: '#ffffff',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.03)',
  borderRadius: '24px',
  padding: '32px'
};

const features = [
  {
    icon: Palette,
    title: "Brand Kit",
    desc: "Set your colors, fonts, and logo once. Every proposal after that matches your brand automatically."
  },
  {
    icon: LayoutTemplate,
    title: "Template Library",
    desc: "Start from a proven structure instead of a blank page."
  },
  {
    icon: Sparkles,
    title: "AI Intake",
    desc: "Describe the deal in your own words. The AI asks what's missing and builds the rest."
  },
  {
    icon: IndianRupee,
    title: "Instant Payments",
    desc: "UPI QR and payment links built right into every proposal."
  }
];

export function Features() {
  return (
    <section className="py-24 px-4 w-full max-w-5xl mx-auto relative z-10">
      <div className="text-center mb-16">
        <h2 className="text-[clamp(32px,5vw,48px)] font-medium text-ink tracking-tight">
          Everything a proposal <span className="font-serif italic font-normal">needs</span>, nothing it doesn't
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div key={idx} style={cardStyle} className="flex flex-col text-left hover:scale-[1.02] transition-transform duration-300">
              <div 
                className="w-[44px] h-[44px] rounded-full flex items-center justify-center mb-6"
                style={{ background: 'rgba(23,23,23,0.04)' }}
              >
                <Icon className="w-5 h-5 text-ink" />
              </div>
              <h3 className="text-[16px] font-medium text-ink mb-2">{feat.title}</h3>
              <p className="text-[14px] text-slate leading-relaxed">
                {feat.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
