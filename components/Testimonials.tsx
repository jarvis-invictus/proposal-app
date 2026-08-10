import React from 'react';

const cardStyle = {
  background: '#ffffff',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.03)',
  borderRadius: '24px',
  padding: '32px'
};

// DEV NOTE: Do not launch with fabricated quotes.
// Replace these with real user quotes post-beta or hide section entirely until launch.
const placeholders = [
  {
    quote: "[Quote from real user — add before launch]",
    name: "[Name]",
    role: "[Role, Company]",
    initials: "AB"
  },
  {
    quote: "[Quote from real user — add before launch]",
    name: "[Name]",
    role: "[Role, Company]",
    initials: "CD"
  },
  {
    quote: "[Quote from real user — add before launch]",
    name: "[Name]",
    role: "[Role, Company]",
    initials: "EF"
  }
];

export function Testimonials() {
  return (
    <section className="py-24 px-4 w-full max-w-6xl mx-auto relative z-10">
      
      {/* Dev Warning Badge */}
      <div className="flex justify-center mb-6">
        <div className="bg-red-100 text-red-700 text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-red-200">
          Placeholder Content - Do Not Ship
        </div>
      </div>

      <div className="text-center mb-16">
        <h2 className="text-[clamp(32px,5vw,48px)] font-medium text-ink tracking-tight">
          What early users are saying
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {placeholders.map((item, idx) => (
          <div key={idx} style={cardStyle} className="flex flex-col text-left">
            <p className="text-[16px] text-ink leading-relaxed mb-8 italic">
              "{item.quote}"
            </p>
            <div className="mt-auto flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-mist/20 flex items-center justify-center text-ink text-[13px] font-medium">
                {item.initials}
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-medium text-ink">{item.name}</span>
                <span className="text-[13px] text-mist">{item.role}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
