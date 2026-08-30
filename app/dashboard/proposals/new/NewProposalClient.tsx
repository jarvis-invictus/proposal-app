'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProposalSummaryReview } from '@/components/ProposalSummaryReview';
import { ProposalType } from '@/lib/schema/proposal';
import { PromptInput } from '@/components/ui/PromptInput';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export function NewProposalClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<'intake' | 'review' | 'saving' | 'error'>('intake');
  const [summary, setSummary] = useState('');
  const [saveError, setSaveError] = useState('');
  const [generatedProposal, setGeneratedProposal] = useState<ProposalType | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === 'finalize_proposal_details') {
        setSummary((toolCall.args as any).summary);
        setPhase('review');
      }
    }
  });

  const generateFinalProposal = async (finalSummary: string) => {
    setPhase('saving');
    const res = await fetch('/api/generate-proposal', {
      method: 'POST',
      body: JSON.stringify({ summary: finalSummary }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) {
      setGeneratedProposal(null);
      setSaveError(data.error || 'Failed to generate the proposal.');
      setPhase('error');
      return;
    }
    setGeneratedProposal(data);

    // Persist the generated content and open it in the editor.
    const saveRes = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: data }),
    });
    const saved = await saveRes.json();
    if (!saveRes.ok) {
      setSaveError(saved.error || 'Failed to save the proposal.');
      setPhase('error');
      return;
    }
    router.push(`/dashboard/proposals/${saved.id}/edit`);
  };

  if (phase === 'saving') {
    return (
      <div className="card" style={{
        maxWidth: 640, margin: '48px auto 0', padding: 32, textAlign: 'center',
        background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-card-lg)',
        color: 'var(--text-muted)', fontSize: 'var(--text-body)', fontFamily: 'var(--font-sans)',
      }}>
        Generating and saving your proposal…
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={{
        maxWidth: 640, margin: '48px auto 0', padding: 28, borderRadius: 'var(--radius-card-lg)',
        background: 'var(--surface-card)', border: '1px solid var(--status-caution-border)', fontFamily: 'var(--font-sans)',
      }}>
        <h2 style={{ fontSize: 'var(--text-h4)', margin: '0 0 8px', color: 'var(--status-caution-text)' }}>Couldn&apos;t save the proposal</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 16 }}>{saveError}</p>
        {generatedProposal && (
          <>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 8 }}>
              The generated content is below — nothing was lost, it just didn&apos;t save. Try again or copy it manually.
            </p>
            <pre style={{
              background: 'var(--surface-sunken)', padding: 16, borderRadius: 'var(--radius-sm)', overflow: 'auto',
              fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-hairline)',
            }}>
              {JSON.stringify(generatedProposal, null, 2)}
            </pre>
          </>
        )}
        <Button variant="primary" style={{ marginTop: 16 }} onClick={() => setPhase('review')}>Back to review</Button>
      </div>
    );
  }

  if (phase === 'review') {
    return <ProposalSummaryReview initialSummary={summary} onGenerate={generateFinalProposal} />;
  }

  return (
    <div style={{
      maxWidth: 720, margin: '32px auto 0', height: 640, display: 'flex', flexDirection: 'column',
      borderRadius: 'var(--radius-card-lg)', overflow: 'hidden', background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-hover)',
    }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-hairline)', fontFamily: 'var(--font-sans)' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h4)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>Deal Intake</h2>
        <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Describe the deal or paste a call transcript.</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Start by describing the project or pasting a transcript.
          </div>
        )}

        {messages.map((m) => {
          // Hide tool call messages from the UI
          if (m.role === 'assistant' && m.toolInvocations) return null;
          if (m.role === 'tool') return null;

          const isUser = m.role === 'user';
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', borderRadius: 'var(--radius-card)', padding: '10px 14px',
                background: isUser ? 'var(--ink)' : 'var(--surface-sunken)',
                color: isUser ? 'var(--text-inverse)' : 'var(--text-primary)',
                fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)', fontFamily: 'var(--font-sans)',
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 'var(--radius-card)', padding: '12px 16px',
              background: 'var(--surface-sunken)',
            }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)',
                  animation: `dot-bounce 1.2s ${i * 160}ms infinite ease-in-out`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: '1px solid var(--border-hairline)' }}>
        <PromptInput
          value={input}
          onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLTextAreaElement>)}
          onSubmit={() => handleSubmit()}
          placeholder="Type your deal details or paste transcript..."
          size="sm"
        />
      </div>
    </div>
  );
}
