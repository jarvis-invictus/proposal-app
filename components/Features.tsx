import React from 'react';
import { Palette, LayoutTemplate, Sparkles, IndianRupee } from 'lucide-react';

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
    <section className="py-24 px-4 w-full max-w-5xl mx-auto relative z-10 screen-in delay-200">
      <div className="text-center mb-16">
        <h2 className="text-[clamp(32px,5vw,48px)] font-medium text-ink tracking-tight">
          Everything a proposal <span className="font-serif italic font-normal">needs</span>, nothing it doesn't
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div 
              key={idx} 
              className={`flex flex-col text-left liquid hover-lift hover-lift-brand rounded-[20px] p-[32px] screen-in delay-${(idx + 1) * 100}`}
            >
              <div 
                className="w-[44px] h-[44px] rounded-[999px] flex items-center justify-center mb-6 bg-ink-04"
              >
                <Icon className="w-5 h-5 text-ink" strokeWidth={1.5} />
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
