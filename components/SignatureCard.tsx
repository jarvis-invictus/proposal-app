export function SignatureCard() {
  return (
    <div className="w-full max-w-[620px] mx-auto mt-[40px] px-4 sm:px-0">
      <div 
        className="flex flex-col md:flex-row w-full"
        style={{
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 20px 60px rgba(23, 23, 23, 0.10)',
          borderRadius: '20px',
          padding: '24px 28px'
        }}
      >
        {/* Left column */}
        <div className="flex-1 md:pr-6 pb-6 md:pb-0 md:border-r border-[rgba(0,0,0,0.05)] md:mr-6">
          <div 
            style={{ 
              fontSize: '11px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.06em', 
              color: '#8792a0',
              marginBottom: '16px'
            }}
          >
            RAW BRAINSTORMING
          </div>
          <div 
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#3d4451',
              lineHeight: '1.6'
            }}
          >
            <p className="mb-2">client: acme corp</p>
            <p className="mb-2">budget around 50k</p>
            <p className="mb-2">need to redesign their core SaaS dashboard, current one is too clunky and users are churning</p>
            <p className="mb-2">timeline: 3 months max</p>
            <p>deliverables: UI components, design system, maybe some react code?</p>
          </div>
        </div>

        {/* Right column */}
        <div className="flex-[1.2] relative pt-6 md:pt-0 border-t border-[rgba(0,0,0,0.05)] md:border-t-0">
          <div className="flex items-start justify-between mb-4">
            <div 
              style={{ 
                fontSize: '11px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.06em', 
                color: '#8792a0' 
              }}
            >
              STRUCTURED PACKAGE
            </div>
            <div 
              style={{
                background: 'rgba(255,255,255,0.8)',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: 600,
                color: '#171717',
                border: '1px solid rgba(255,255,255,0.9)'
              }}
            >
              Acme Corp
            </div>
          </div>

          <h3 
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontStyle: 'italic',
              fontSize: '22px',
              color: '#171717',
              marginBottom: '12px'
            }}
          >
            Executive Summary
          </h3>
          <p 
            style={{
              fontSize: '13px',
              color: '#3d4451',
              lineHeight: '1.6',
              marginBottom: '20px'
            }}
          >
            Acme Corp requires a modernized SaaS dashboard to improve user retention. This proposal outlines a comprehensive 3-month strategy to deliver a scalable design system and optimized UI components.
          </p>

          <div className="flex gap-4">
            <div 
              style={{
                background: 'rgba(255,255,255,0.5)',
                borderRadius: '8px',
                padding: '10px 12px',
                flex: 1
              }}
            >
              <div style={{ fontSize: '10px', color: '#8792a0', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Timeline</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#171717' }}>12 Weeks</div>
            </div>
            <div 
              style={{
                background: 'rgba(255,255,255,0.5)',
                borderRadius: '8px',
                padding: '10px 12px',
                flex: 1
              }}
            >
              <div style={{ fontSize: '10px', color: '#8792a0', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Investment</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#171717' }}>$50,000</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
