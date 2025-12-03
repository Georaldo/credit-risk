// frontend/components/officer/AgentOpinionPanel.tsx
import { useState } from 'react';

interface AgentResponse {
  assessment_summary: string;
  key_concerns: string[];
  positive_factors: string[];
  recommendation: string;
  confidence_score: number;
}

interface Props {
  features: any;
  prediction: number | null;
  probability: number | null;
}

export default function AgentOpinionPanel({ features, prediction, probability }: Props) {
  const [analysis, setAnalysis] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAgentOpinion = async () => {
    if (prediction === null) return;
    
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/officer/agent-evaluation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming you store token here
        },
        body: JSON.stringify({
          features,
          model_prediction: prediction,
          model_probability: probability
        })
      });
      
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🤖 Smart Risk Agent
        </h2>
        <button 
          onClick={fetchAgentOpinion}
          disabled={loading || prediction === null}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {loading ? 'Analyzing...' : 'Ask Agent for Opinion'}
        </button>
      </div>

      {analysis && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Summary Box */}
          <div className={`p-4 rounded-lg border-l-4 ${
            analysis.recommendation === 'Approve' ? 'bg-green-50 border-green-500' : 
            analysis.recommendation === 'Reject' ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'
          }`}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-gray-900 mb-1">Agent Recommendation: {analysis.recommendation}</h3>
                    <p className="text-gray-700 text-sm">{analysis.assessment_summary}</p>
                </div>
                <div className="text-right">
                    <span className="block text-xs text-gray-500 uppercase">Confidence</span>
                    <span className="font-mono font-bold text-lg">{analysis.confidence_score}%</span>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Positive Factors */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                ✅ Positive Factors
              </h4>
              <ul className="list-disc pl-4 space-y-1">
                {analysis.positive_factors.map((factor, i) => (
                  <li key={i} className="text-sm text-gray-600">{factor}</li>
                ))}
              </ul>
            </div>

            {/* Concerns */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                ⚠️ Key Concerns
              </h4>
              <ul className="list-disc pl-4 space-y-1">
                {analysis.key_concerns.map((concern, i) => (
                  <li key={i} className="text-sm text-gray-600">{concern}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}