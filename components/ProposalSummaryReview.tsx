import { useState } from 'react';
import { Button } from './ui/Button';

export function ProposalSummaryReview({
  initialSummary,
  onGenerate
}: {
  initialSummary: string;
  onGenerate: (summary: string) => void;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await onGenerate(summary);
    setIsGenerating(false);
  };

  return (
    <div style={{
      maxWidth: 720, margin: '32px auto 0', padding: 28, borderRadius: 'var(--radius-card-lg)',
      background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-hover)',
      fontFamily: 'var(--font-sans)',
    }}>
      <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', margin: '0 0 8px' }}>
        Confirm Proposal Facts
      </h2>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 20 }}>
        Review the facts we gathered below. You can edit this text directly before generating the final proposal.
      </p>

      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        style={{
          width: '100%', height: 260, padding: 14, marginBottom: 20, resize: 'vertical',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: 'var(--surface-sunken)',
          outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = 'var(--ring-focus)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-hairline)'; e.currentTarget.style.boxShadow = 'none'; }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={handleGenerate} loading={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Final Proposal'}
        </Button>
      </div>
    </div>
  );
}
