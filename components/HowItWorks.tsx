import React from 'react';

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
  // id is the target of the navbar's "Solutions" link — without it that link was a dead anchor.
  return (
    <section id="solutions" className="py-24 px-4 w-full max-w-5xl mx-auto relative z-10 screen-in delay-100">
      <div className="text-center mb-20">
        <h2 className="text-[clamp(32px,5vw,48px)] font-medium text-ink tracking-tight">
          From notes to <span className="font-serif italic font-normal">sent</span>, in three steps
        </h2>
      </div>

      <div className="relative">
        {/* Horizontal connecting line (hidden on mobile, visible md+) */}
        <div className="hidden md:block absolute top-[22px] left-[15%] right-[15%] h-[1px] bg-ink-08" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className={`relative flex flex-col p-8 text-left z-10 liquid hover-lift hover-lift-brand rounded-[20px] screen-in delay-${(idx + 1) * 100}`}
            >
              <div 
                className="w-10 h-10 rounded-[999px] flex items-center justify-center text-[15px] font-semibold mb-8 text-ink bg-ink-04"
              >
                {step.num}
              </div>
              <h3 className="text-[20px] font-medium text-ink mb-3 tracking-tight">{step.title}</h3>
              <p className="text-[15px] text-slate leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
