// API service for disclosure operations
export interface EvidenceSpan {
  page: number;
  text: string;
}

export interface Contrast {
  priorArt: string;
  ourApproach: string;
  whyItMatters: string;
}

export interface KeyDifference {
  ordinal: number;
  statementMd: string;
  contrast?: Contrast;
  evidenceSpans: EvidenceSpan[];
  confidence: number;
}

export interface Inventor {
  name: string;
  email?: string;
  affiliation?: string;
}

export interface RawExtraction {
  fileKey?: string;
  extractionData?: KeyDifference[];
  confidenceScores?: {
    title?: number;
    description?: number;
    keyDiffs?: number;
    inventors?: number;
  };
  evidence?: {
    title?: EvidenceSpan[];
    description?: EvidenceSpan[];
    keyDiffs?: EvidenceSpan[];
    inventors?: EvidenceSpan[];
  };
  deadline?: {
    label: string;
    date: string;
  };
}

export interface Disclosure {
  id: string;
  docketNumber: number;
  title: string;
  description: string;
  keyDifferences: KeyDifference[];
  inventors: Inventor[];
  uri?: string;
  rawExtraction?: RawExtraction;
  publicPlanned?: boolean;
  publicVenue?: string | null;
  publicDate?: string | null;
  createdAt: string;
  updatedAt: string;
  similarityScore?: number; // Added for similar disclosures
}

export interface DisclosureFilters {
  search?: string;
  confidence?: 'high' | 'medium' | 'low';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'docketNumber' | 'title';
  orderDirection?: 'ASC' | 'DESC';
}

export interface DisclosureResponse {
  success: boolean;
  disclosures: Disclosure[];
  total: number;
  limit: number;
  offset: number;
}

class DisclosureApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (import.meta as any)?.env?.VITE_BACKEND_URL || "http://localhost:3000";
  }

  /**
   * Fetch disclosures with optional filters, search, and pagination
   */
  async getDisclosures(filters: DisclosureFilters = {}): Promise<DisclosureResponse> {
    const params = new URLSearchParams();
    
    // Add filters to query parameters
    if (filters.search) params.append('search', filters.search);
    if (filters.confidence) params.append('confidence', filters.confidence);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (filters.orderBy) params.append('orderBy', filters.orderBy);
    if (filters.orderDirection) params.append('orderDirection', filters.orderDirection);

    const url = `${this.baseUrl}/api/disclosures${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch disclosures`);
    }

    return await response.json();
  }

  /**
   * Get a single disclosure by ID
   */
  async getDisclosureById(id: string): Promise<{ success: boolean; disclosure: Disclosure }> {
    const response = await fetch(`${this.baseUrl}/api/disclosures/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch disclosure`);
    }

    return await response.json();
  }

  /**
   * Get similar disclosures for a given disclosure ID
   */
  async getSimilarDisclosures(id: string, topK: number = 12): Promise<{ success: boolean; similarDisclosures: Disclosure[] }> {
    const response = await fetch(`${this.baseUrl}/api/disclosures/${id}/similar?topK=${topK}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch similar disclosures`);
    }

    return await response.json();
  }

  /**
   * Create a new disclosure
   */
  async createDisclosure(disclosureData: {
    title: string;
    description: string;
    keyDifferences: KeyDifference[];
    inventors: Inventor[];
    uri?: string;
    rawExtraction?: RawExtraction;
    publicPlanned?: boolean;
    publicVenue?: string | null;
    publicDate?: string | null;
  }): Promise<{ success: boolean; disclosure: Disclosure; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/disclosures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(disclosureData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to create disclosure`);
    }

    return await response.json();
  }

  /**
   * Calculate confidence level from disclosure data
   */
  calculateConfidence(disclosure: Disclosure): 'high' | 'medium' | 'low' {
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
  }

  /**
   * Generate docket number string
   */
  generateDocketString(docketNumber: number): string {
    return `IDF-${String(docketNumber).padStart(4, "0")}`;
  }

  /**
   * Get docket number from disclosure
   */
  getDocketNumber(disclosure: Disclosure): number {
    return disclosure.docketNumber || 0;
  }

  /**
   * Extract key differences summary
   */
  extractKeyDifferencesSummary(disclosure: Disclosure): string[] {
    if (!disclosure.keyDifferences || !Array.isArray(disclosure.keyDifferences)) {
      return [];
    }

    return disclosure.keyDifferences
      .map((kd: KeyDifference) => kd.statementMd || '')
      .filter(Boolean)
      .slice(0, 3); // Limit to first 3 for summary
  }

  /**
   * Extract inventors names
   */
  extractInventorNames(disclosure: Disclosure): string[] {
    if (!disclosure.inventors || !Array.isArray(disclosure.inventors)) {
      return [];
    }

    return disclosure.inventors
      .map((inv: Inventor) => inv.name || '')
      .filter(Boolean);
  }
}

export const disclosureApi = new DisclosureApiService();
