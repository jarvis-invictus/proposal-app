'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';
import { ProposalSummaryReview } from '@/components/ProposalSummaryReview';
import { ProposalType } from '@/lib/schema/proposal';

export default function NewProposalPage() {
  const [phase, setPhase] = useState<'intake' | 'review' | 'done'>('intake');
  const [summary, setSummary] = useState('');
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
    const res = await fetch('/api/generate-proposal', {
      method: 'POST',
      body: JSON.stringify({ summary: finalSummary }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    setGeneratedProposal(data);
    setPhase('done');
  };

  if (phase === 'done' && generatedProposal) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-6 bg-white shadow-sm rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4">Proposal Generated Successfully!</h2>
        <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm border border-gray-100">
          {JSON.stringify(generatedProposal, null, 2)}
        </pre>
      </div>
    );
  }

  if (phase === 'review') {
    return <ProposalSummaryReview initialSummary={summary} onGenerate={generateFinalProposal} />;
  }

  return (
    <div className="max-w-3xl mx-auto mt-8 flex flex-col h-[700px] border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold">Deal Intake</h2>
        <p className="text-sm text-gray-500">Describe the deal or paste a call transcript.</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            Start by describing the project or pasting a transcript.
          </div>
        )}
        
        {messages.map((m) => {
          // Hide tool call messages from the UI
          if (m.role === 'assistant' && m.toolInvocations) {
             return null;
          }
          if (m.role === 'tool') return null;

          return (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                {m.content}
              </div>
            </div>
          )
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-900 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            placeholder="Type your deal details or paste transcript..."
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
