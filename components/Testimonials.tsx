import React from 'react';

const testimonials = [
  {
    quote: "I used to spend 3 hours hacking together decks in Figma. Now I type a few bullets and Marg hands me a beautiful, branded proposal that my clients can sign instantly.",
    author: "Sarah J.",
    role: "Freelance Designer"
  },
  {
    quote: "The AI doesn't just write fluff, it actually structures the pricing and terms exactly how we discussed on the call. This is going to save my agency days of work every month.",
    author: "Mark T.",
    role: "Agency Founder"
  }
];

export function Testimonials() {
  return (
    <section className="py-24 px-4 w-full max-w-5xl mx-auto relative z-10 screen-in delay-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {testimonials.map((test, idx) => (
          <div 
            key={idx} 
            className={`flex flex-col text-left liquid hover-lift hover-lift-brand rounded-[20px] p-[32px] screen-in delay-${(idx + 1) * 100}`}
          >
            <div className="flex gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5 text-ink" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            
            <p className="text-[17px] text-ink leading-relaxed mb-8 flex-1 font-medium">
              "{test.quote}"
            </p>
            
            <div className="flex items-center gap-4 mt-auto">
              <div className="w-10 h-10 rounded-[999px] bg-ink-08 flex items-center justify-center font-serif text-ink text-lg">
                {test.author[0]}
              </div>
              <div>
                <div className="text-[15px] font-medium text-ink">{test.author}</div>
                <div className="text-[13px] text-slate">{test.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
