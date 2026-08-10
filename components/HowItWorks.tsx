import React from 'react';

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.55)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(255, 255, 255, 0.7)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)'
};

const smallGlassStyle = {
  background: 'rgba(255, 255, 255, 0.45)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(255, 255, 255, 0.6)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.5)'
};

const steps = [
  {
    num: "01",
    title: "Describe your deal",
    desc: "Paste your notes, a call transcript, or just type what you agreed to."
  },
  {
    num: "02",
    title: "AI builds the proposal",
    desc: "It asks what's missing, then generates a branded, structured package in your voice."
  },
  {
    num: "03",
    title: "Send the link, get paid",
    desc: "One shareable link. Your client views it, accepts, and pays — no PDF required."
  }
];

export function HowItWorks() {
  return (
    <section className="py-24 px-4 w-full max-w-5xl mx-auto relative z-10">
      <div className="text-center mb-20">
        <h2 className="text-[clamp(32px,5vw,48px)] font-medium text-ink tracking-tight">
          From notes to <span className="font-serif italic font-normal">sent</span>, in three steps
        </h2>
      </div>

      <div className="relative">
        {/* Horizontal connecting line (hidden on mobile, visible md+) */}
        <div className="hidden md:block absolute top-[22px] left-[15%] right-[15%] h-[1px] bg-mist/30" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex flex-col items-center md:items-start text-center md:text-left z-10">
              <div 
                className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] text-mist font-medium mb-6"
                style={smallGlassStyle}
              >
                {step.num}
              </div>
              <h3 className="text-[18px] font-medium text-ink mb-3">{step.title}</h3>
              <p className="text-[14px] text-slate leading-relaxed max-w-[280px]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
