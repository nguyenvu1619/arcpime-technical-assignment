import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { disclosureApi, type Disclosure } from "../services/disclosureApi";
import KeyDifferences from "./KeyDifferences";
import PDFPreview from "./PDFPreview";
import ConfidenceBadge from "./ConfidenceBadge";
import DeadlineBadge from "./DeadlineBadge";

// Similar disclosures interface
interface SimilarDisclosure {
  id: string;
  title: string;
  inventors: any[];
  similarityScore?: number;
  docket_number?: number;
  docketNumber?: number;
}

const DisclosureDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null);
  const [similarDisclosures, setSimilarDisclosures] = useState<SimilarDisclosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No disclosure ID provided");
      setLoading(false);
      return;
    }

    const fetchDisclosure = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await disclosureApi.getDisclosureById(id);
        setDisclosure(response.disclosure);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to fetch disclosure:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchSimilarDisclosures = async () => {
      try {
        setSimilarLoading(true);
        const response = await disclosureApi.getSimilarDisclosures(id, 12);
        setSimilarDisclosures(response.similarDisclosures);
      } catch (err: any) {
        console.error('Failed to fetch similar disclosures:', err);
        // Don't set error state for similar disclosures as it's not critical
      } finally {
        setSimilarLoading(false);
      }
    };

    fetchDisclosure();
    fetchSimilarDisclosures();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading disclosure...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !disclosure) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <div className="font-medium">Failed to load disclosure</div>
            <div className="mt-1 text-sm">{error}</div>
            <button
              onClick={() => navigate('/')}
              className="mt-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
            >
              Back to Triage Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const docketString = disclosureApi.generateDocketString(disclosureApi.getDocketNumber(disclosure));
  const confidence = disclosureApi.calculateConfidence(disclosure);
  const deadline = disclosure.publicDate
  const inventorNames = disclosureApi.extractInventorNames(disclosure);
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm"
          >
            ← Back to Triage Queue
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Disclosure Details</h1>
            <p className="text-gray-500 text-sm">Review and manage invention disclosure</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{docketString}</span>
                    <ConfidenceBadge level={confidence} />
                    <DeadlineBadge date={deadline || ''} />
                  </div>
                  <h2 className="text-xl font-semibold">{disclosure.title}</h2>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{disclosure.description}</p>
                </div>

                {inventorNames.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Inventors</h3>
                    <div className="flex flex-wrap gap-2">
                      {inventorNames.map((name, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Key Differences */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="font-semibold text-lg mb-4">Key Differences & Novelty</h3>
              <KeyDifferences 
                keyDifferences={disclosure.keyDifferences}
                isEditable={false}
                showFullDetails={true}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="font-semibold mb-4">Actions</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700">
                  Advance to Next Stage
                </button>
                <button className="w-full px-4 py-2 rounded-lg bg-white border text-sm hover:bg-gray-50">
                  Request Additional Information
                </button>
                <button className="w-full px-4 py-2 rounded-lg bg-white border text-sm hover:bg-gray-50">
                  Merge with Related Disclosure
                </button>
                <button className="w-full px-4 py-2 rounded-lg bg-white border text-sm hover:bg-gray-50 text-rose-600">
                  Decline Disclosure
                </button>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="font-semibold mb-4">Metadata</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Created:</span>
                  <div className="font-medium">{new Date(disclosure.createdAt || '').toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <div className="font-medium">{new Date(disclosure.updatedAt || '').toLocaleString()}</div>
                </div>
                {disclosure.uri && (
                  <div>
                    <span className="text-gray-500">Source Document:</span>
                    <div className="mt-2">
                      <PDFPreview 
                        s3Key={`pdfs/${disclosure.uri.split('/').pop()}`}
                        height="400px"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Similarity Candidates */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-semibold text-lg mb-4">Similarity Candidates</h3>
          {similarLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading similar disclosures...</span>
              </div>
            </div>
          ) : similarDisclosures.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-4">
              {similarDisclosures.map((similar) => {
                const docketString = disclosureApi.generateDocketString(
                  disclosureApi.getDocketNumber(similar as Disclosure)
                );
                const inventorNames = disclosureApi.extractInventorNames(similar as Disclosure);
                const score = similar.similarityScore || 0;
                
                return (
                  <div key={similar.id} className="border rounded-xl p-4 hover:shadow-sm transition">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{docketString}</span>
                      <span className="ml-auto text-xs px-2 py-1 rounded-full bg-gray-100">
                        {(score * 100).toFixed(0)}% similar
                      </span>
                    </div>
                    <div className="text-sm font-medium mb-1">{similar.title}</div>
                    <div className="text-xs text-gray-500 mb-3">
                      Inventors: {inventorNames.length > 0 ? inventorNames.join(", ") : "N/A"}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigate(`/disclosure/${similar.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-white border text-xs hover:bg-gray-50"
                      >
                        View
                      </button>
                      <button className="px-3 py-1.5 rounded-lg bg-white border text-xs hover:bg-gray-50">
                        Merge
                      </button>
                      <button className="px-3 py-1.5 rounded-lg bg-white border text-xs hover:bg-gray-50">
                        Relate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No similar disclosures found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisclosureDetail;
