import { useState } from 'react';
import { ProposalType } from '@/lib/schema/proposal';

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
    <div className="max-w-3xl mx-auto mt-8 bg-white p-6 shadow-sm rounded-lg border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Confirm Proposal Facts</h2>
      <p className="text-sm text-gray-600 mb-6">
        Review the facts we gathered below. You can edit this text directly before generating the final proposal.
      </p>
      
      <textarea
        className="w-full h-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6 font-mono text-sm"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      
      <div className="flex justify-end gap-4">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate Final Proposal'}
        </button>
      </div>
    </div>
  );
}
