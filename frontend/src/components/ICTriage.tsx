import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DeadlineBadge from "./DeadlineBadge";
import ConfidenceBadge from "./ConfidenceBadge";

const ICTriage: React.FC = () => {
  const navigate = useNavigate();
  const [filterDeadline, setFilterDeadline] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("DESC");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);

  const backendBaseUrl = (import.meta as any)?.env?.VITE_BACKEND_URL || "http://localhost:3000";

  const fetchDisclosures = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('limit', pageSize.toString());
      params.append('offset', (currentPage * pageSize).toString());
      params.append('orderBy', sortBy);
      params.append('orderDirection', sortDirection);

      if (filterDeadline !== "all") {
        const now = new Date();
        const withinDays = filterDeadline === "30" ? 30 : filterDeadline === "60" ? 60 : 90;
        const futureDate = new Date(now.getTime() + (withinDays * 24 * 60 * 60 * 1000));
        params.append('dateFrom', now.toISOString().split('T')[0]);
        params.append('dateTo', futureDate.toISOString().split('T')[0]);
      }

      const publicPlannedParam = (new URLSearchParams(window.location.search)).get('publicPlanned');
      if (publicPlannedParam === 'true' || publicPlannedParam === 'false') {
        params.append('publicPlanned', publicPlannedParam);
      }
      const response = await fetch(`${backendBaseUrl}/api/disclosures?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch disclosures`);
      }

      const data = await response.json();
      
      const transformedItems = data.disclosures.map((disclosure: any) => {
        const confidence = calculateConfidence(disclosure);
        const deadline = extractDeadline(disclosure);
        const keyDiffSummary = extractKeyDifferencesSummary(disclosure);
        const inventors = extractInventorNames(disclosure);

        return {
          id: disclosure.id,
          docket: `IDF-${String(disclosure.docketNumber || 0).padStart(4, "0")}`,
          title: disclosure.title,
          confidence,
          inventors,
          deadline,
          dupes: 0,
          scanned: false,
          keyDiffSummary,
          rawData: disclosure,
          publicDate: disclosure.publicDate || null,
        };
      });

      setItems(transformedItems);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch disclosures:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateConfidence = (disclosure: any): 'high' | 'medium' | 'low' => {
    if (!disclosure.rawExtraction?.confidenceScores) {
      return 'medium';
    }

    const scores = disclosure.rawExtraction.confidenceScores;
    const avgConfidence = (
      (scores.title || 0) + 
      (scores.description || 0) + 
      (scores.keyDiffs || 0) + 
      (scores.inventors || 0)
    ) / 4;

    if (avgConfidence > 0.7) return 'high';
    if (avgConfidence > 0.4) return 'medium';
    return 'low';
  };

  const extractDeadline = (disclosure: any): { label: string; date: string } | null => {
    if (!disclosure.rawExtraction?.deadline) {
      return null;
    }
    return disclosure.rawExtraction.deadline;
  };

  const extractKeyDifferencesSummary = (disclosure: any): string[] => {
    if (!disclosure.keyDifferences || !Array.isArray(disclosure.keyDifferences)) {
      return [];
    }

    return disclosure.keyDifferences
      .map((kd: any) => kd.statementMd || '')
      .filter(Boolean)
      .slice(0, 3);
  };

  const extractInventorNames = (disclosure: any): string[] => {
    if (!disclosure.inventors || !Array.isArray(disclosure.inventors)) {
      return [];
    }

    return disclosure.inventors
      .map((inv: any) => inv.name || '')
      .filter(Boolean);
  };

  useEffect(() => {
    fetchDisclosures();
  }, [filterDeadline, sortBy, sortDirection, currentPage]);

  const filtered = items;

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">IC Triage Queue</h2>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-gray-500">Deadline risk:</span>
          <select
            className="rounded-xl border px-2 py-1"
            value={filterDeadline}
            onChange={(e) => setFilterDeadline(e.target.value)}
          >
            <option value="all">All</option>
            <option value="30">Next 30 days</option>
            <option value="60">Next 60 days</option>
            <option value="90">Next 90 days</option>
          </select>
          <span className="text-gray-500">Public planned:</span>
          <select
            className="rounded-xl border px-2 py-1"
            value={(new URLSearchParams(window.location.search)).get('publicPlanned') || 'all'}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search)
              if (e.target.value === 'all') {
                params.delete('publicPlanned')
              } else {
                params.set('publicPlanned', e.target.value)
              }
              const qs = params.toString()
              const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`
              window.history.replaceState(null, '', url)
              fetchDisclosures()
            }}
          >
            <option value="all">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            className="rounded-xl border px-3 py-2"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Sort by Date</option>
            <option value="docketNumber">Sort by Docket</option>
            <option value="title">Sort by Title</option>
          </select>

          <button
            onClick={() => setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC')}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50 flex items-center gap-1"
            title={`Sort ${sortDirection === 'ASC' ? 'Descending' : 'Ascending'}`}
          >
            {sortDirection === 'ASC' ? '↑' : '↓'}
          </button>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            {loading ? (
              <span>Loading...</span>
            ) : error ? (
              <span className="text-red-600">Error: {error}</span>
            ) : (
              <span>Showing {filtered.length} of {total} disclosures</span>
            )}
          </div>
          {total > pageSize && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-2 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span>Page {currentPage + 1} of {Math.ceil(total / pageSize)}</span>
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(total / pageSize) - 1, currentPage + 1))}
                disabled={currentPage >= Math.ceil(total / pageSize) - 1}
                className="px-2 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading disclosures...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <div className="font-medium">Failed to load disclosures</div>
          <div className="mt-1 text-sm">{error}</div>
          <button
            onClick={fetchDisclosures}
            className="mt-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-lg font-medium">No disclosures found</div>
          <div className="text-sm mt-1">
            {filterDeadline !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'No disclosures have been submitted yet'
            }
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((it, idx) => (
            <div 
              key={it.id || idx} 
              className="rounded-2xl border p-4 hover:shadow-md hover:border-indigo-300 transition cursor-pointer group"
              onClick={() => navigate(`/disclosure/${it.id}`)}
            >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{it.docket}</span>
                <h3 className="font-medium truncate group-hover:text-indigo-600 transition">{it.title}</h3>
              <div className="ml-auto flex items-center gap-2">
                <DeadlineBadge date={it.publicDate} />
                <ConfidenceBadge level={it.confidence} />
                {it.dupes > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">{it.dupes} dupes</span>
                )}
                {it.scanned && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">OCR</span>
                )}
              </div>
            </div>
              {it.keyDiffSummary.length > 0 && (
            <ul className="mt-2 text-sm list-disc list-inside text-gray-700">
                  {it.keyDiffSummary.map((b: string, i: number) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
              )}
              {it.inventors.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">Inventors: {it.inventors.join(", ")}</div>
              )}
            <div className="mt-3 flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700">Advance</button>
              <button className="px-3 py-1.5 rounded-lg bg-white border text-sm hover:bg-gray-50">Request info</button>
              <button className="px-3 py-1.5 rounded-lg bg-white border text-sm hover:bg-gray-50">Merge/Relate</button>
              <button className="px-3 py-1.5 rounded-lg bg-white border text-sm hover:bg-gray-50 text-rose-600">Decline</button>
            </div>
          </div>
        ))}
      </div>
      )}

    </div>
  );
};

export default ICTriage;


