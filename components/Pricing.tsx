import React from 'react';
import Link from 'next/link';

// DEV NOTE: PLACEHOLDER PRICING
// These numbers are placeholders pending real validation with actual users.
const plans = [
  {
    name: "Free",
    price: "₹0",
    interval: "",
    desc: "1 active proposal. Full AI generation and brand kit. No credit card required.",
    cta: "Start Free",
    highlight: false
  },
  {
    name: "Pay per proposal",
    price: "₹249",
    interval: "/ proposal",
    desc: "For occasional sends. No subscription, pay only when you publish.",
    cta: "Get Started",
    highlight: true,
    badge: "Most flexible"
  },
  {
    name: "Agency",
    price: "₹999",
    interval: "/ month",
    desc: "Unlimited proposals. For teams sending regularly.",
    cta: "Start Free Trial",
    highlight: false
  }
];

export function Pricing() {
  return (
    <section className="py-24 px-4 w-full max-w-6xl mx-auto relative z-10 screen-in delay-300" id="pricing">
      
      {/* Dev Warning Badge */}
      <div className="flex justify-center mb-6">
        <div className="bg-yellow-100 text-yellow-800 text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-[999px] border border-yellow-200">
          Placeholder Pricing
        </div>
      </div>

      <div className="text-center mb-16">
        <h2 className="text-[clamp(32px,5vw,48px)] font-medium text-ink tracking-tight">
          Pricing that fits how often you send
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan, idx) => (
          <div 
            key={idx} 
            className={`flex flex-col text-left relative liquid hover-lift hover-lift-brand rounded-[20px] p-[36px] ${plan.highlight ? 'lg:-translate-y-4 border-brand' : ''}`}
          >
            {plan.badge && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-ink text-white text-[12px] font-semibold px-3 py-1 rounded-[999px] whitespace-nowrap">
                {plan.badge}
              </div>
            )}
            
            <div className="text-[18px] font-medium text-ink mb-4">{plan.name}</div>
            
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-[42px] font-semibold text-ink leading-none">{plan.price}</span>
              {plan.interval && <span className="text-[15px] text-slate">{plan.interval}</span>}
            </div>
            
            <p className="text-[14px] text-slate leading-relaxed mb-10 flex-1">
              {plan.desc}
            </p>
            
            <Link 
              href={plan.name === 'Free' ? '/signup' : '#'}
              className={`text-center w-full rounded-[999px] px-5 py-3 text-[15px] font-medium transition-all flex items-center justify-center ${
                plan.highlight 
                  ? 'bg-brand-tint border border-brand text-brand-ink hover:bg-[#dcecf7] hover:-translate-y-[2px] shadow-[0_4px_14px_rgba(47,127,191,0.16)]' 
                  : 'bg-ink-04 text-ink border border-ink-08 hover:bg-ink-08'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
