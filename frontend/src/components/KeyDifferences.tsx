import React from "react";

interface KeyDifferencesProps {
  keyDifferences: any[];
  isEditable?: boolean;
  onUpdate?: (keyDifferences: any[]) => void;
  showFullDetails?: boolean;
}

const KeyDifferences: React.FC<KeyDifferencesProps> = ({
  keyDifferences,
  isEditable = false,
  onUpdate,
  showFullDetails = true
}) => {
  const handleKeyDiffChange = (index: number, value: string) => {
    if (!onUpdate) return;
    
    const updated = [...keyDifferences];
    if (updated[index]) {
      updated[index] = { ...updated[index], statementMd: value };
    } else {
      updated[index] = { statementMd: value, ordinal: index + 1 };
    }
    onUpdate(updated);
  };

  const addKeyDiff = () => {
    if (!onUpdate) return;
    onUpdate([...keyDifferences, { statementMd: "", ordinal: keyDifferences.length + 1 }]);
  };

  const removeKeyDiff = (index: number) => {
    if (!onUpdate) return;
    const updated = keyDifferences.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  if (!keyDifferences || keyDifferences.length === 0) {
    return (
      <div>
        <label className="block text-sm font-medium mb-2">Key differences / What's novel?</label>
        {isEditable ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                value=""
                onChange={(e) => handleKeyDiffChange(0, e.target.value)}
                className="flex-1 rounded-xl border px-3 py-2"
                placeholder="One concise bullet (5–180 chars)"
              />
              <button
                onClick={() => removeKeyDiff(0)}
                className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50"
                aria-label="Remove bullet"
              >
                Remove
              </button>
            </div>
            <button
              onClick={addKeyDiff}
              className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            >
              + Add bullet
            </button>
          </div>
        ) : (
          <p className="text-gray-500 italic">No key differences specified</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Key differences / What's novel?</label>
      <div className="space-y-3">
        {keyDifferences.map((kd: any, idx: number) => (
          <div key={idx} className="rounded-xl border p-3">
            <div className="flex items-start gap-2">
              <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">#{kd.ordinal || idx + 1}</span>
              {isEditable ? (
                <input
                  value={kd.statementMd || kd.statement_md || kd.statement || ""}
                  onChange={(e) => handleKeyDiffChange(idx, e.target.value)}
                  className="flex-1 rounded-xl border px-3 py-2"
                  placeholder="Novelty statement"
                />
              ) : (
                <div className="flex-1">
                  <p className="text-gray-800">{kd.statementMd || kd.statement_md || kd.statement}</p>
                </div>
              )}
              {isEditable && (
                <button
                  onClick={() => removeKeyDiff(idx)}
                  className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50"
                  aria-label="Remove bullet"
                >
                  Remove
                </button>
              )}
            </div>
            
            {showFullDetails && (kd.confidence !== undefined || (kd.evidenceSpans?.length || kd.evidence_spans?.length) > 0) && (
              <>
                {/* Confidence and Evidence */}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {kd.confidence !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border">
                      Confidence: {Math.round(kd.confidence * 100)}%
                    </span>
                  )}
                  {kd.confidence !== undefined && (kd.evidenceSpans?.length || kd.evidence_spans?.length) > 0 && (
                    <span className="text-gray-400">•</span>
                  )}
                  {(kd.evidenceSpans?.length || kd.evidence_spans?.length) > 0 && (
                    <span className="text-gray-500">Evidence spans: {kd.evidenceSpans?.length || kd.evidence_spans?.length}</span>
                  )}
                </div>

                {/* Contrast Analysis */}
                {kd.contrast && (
                  <div className="mt-2 grid md:grid-cols-3 gap-2 text-xs text-gray-700">
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="font-medium text-gray-800">Prior art</div>
                      <div className="mt-1 whitespace-pre-wrap">{kd.contrast.priorArt || kd.contrast.prior_art || '—'}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="font-medium text-gray-800">Our approach</div>
                      <div className="mt-1 whitespace-pre-wrap">{kd.contrast.ourApproach || kd.contrast.our_approach || '—'}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="font-medium text-gray-800">Why it matters</div>
                      <div className="mt-1 whitespace-pre-wrap">{kd.contrast.whyItMatters || kd.contrast.why_it_matters || '—'}</div>
                    </div>
                  </div>
                )}

                {/* Evidence Spans */}
                {(kd.evidenceSpans || kd.evidence_spans) && (kd.evidenceSpans?.length > 0 || kd.evidence_spans?.length > 0) && (
                  <div className="mt-2 text-xs text-gray-600">
                    <div className="font-medium text-gray-700 mb-1">Evidence</div>
                    <ul className="list-disc list-inside space-y-1">
                      {(kd.evidenceSpans || kd.evidence_spans || []).slice(0, 3).map((ev: any, i: number) => (
                        <li key={i}>p.{ev.page}: <em>{ev.text}</em></li>
                      ))}
                      {(kd.evidenceSpans?.length || kd.evidence_spans?.length || 0) > 3 && (
                        <li className="text-gray-400">+ {(kd.evidenceSpans?.length || kd.evidence_spans?.length || 0) - 3} more…</li>
                      )}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        
        {isEditable && (
          <button
            onClick={addKeyDiff}
            className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
          >
            + Add bullet
          </button>
        )}
      </div>
    </div>
  );
};

export default KeyDifferences;
